import torch
import torch.nn as nn
import torch.nn.functional as F
from transformers import SegformerModel


class MFF(nn.Module):
    """Multi-Feature Fusion module to fuse features from different scales."""

    def __init__(self, in_channels, out_channels):
        super(MFF, self).__init__()
        self.conv = nn.Conv2d(in_channels, out_channels, kernel_size=1, bias=False)
        self.bn = nn.BatchNorm2d(out_channels)
        self.relu = nn.ReLU(inplace=True)

    def forward(self, x1, x2, x3, x4):
        # Resize all feature maps to the size of x1
        x2 = F.interpolate(x2, size=x1.size()[2:], mode="bilinear", align_corners=False)
        x3 = F.interpolate(x3, size=x1.size()[2:], mode="bilinear", align_corners=False)
        x4 = F.interpolate(x4, size=x1.size()[2:], mode="bilinear", align_corners=False)

        # Concatenate all feature maps
        x = torch.cat([x1, x2, x3, x4], dim=1)

        # Apply convolution to reduce channel dimension
        x = self.conv(x)
        x = self.bn(x)
        x = self.relu(x)

        return x


class MSMD(nn.Module):
    """Multi-Scale Multi-Decoder module for utilizing features at different scales."""

    def __init__(self, in_channels, mid_channels, out_channels):
        super(MSMD, self).__init__()

        # Level 1 (highest resolution)
        self.conv_level1 = nn.Conv2d(in_channels, out_channels, kernel_size=1)

        # Level 2
        self.transpose_level2 = nn.ConvTranspose2d(
            in_channels, mid_channels, kernel_size=4, stride=2, padding=1
        )
        self.conv_level2 = nn.Conv2d(
            mid_channels + in_channels, out_channels, kernel_size=1
        )

        # Level 3 (lowest resolution)
        self.transpose_level3 = nn.ConvTranspose2d(
            in_channels, mid_channels, kernel_size=4, stride=2, padding=1
        )
        self.conv_level3 = nn.Conv2d(
            mid_channels + in_channels, out_channels, kernel_size=1
        )

    def forward(self, x1, x2, x3):
        # Level 3 (lowest resolution)
        up3 = self.transpose_level3(x3)
        concat3 = torch.cat([up3, x2], dim=1)
        out3 = self.conv_level3(concat3)

        # Level 2
        up2 = self.transpose_level2(out3)
        concat2 = torch.cat([up2, x1], dim=1)
        out2 = self.conv_level2(concat2)

        # Level 1 (highest resolution)
        out1 = self.conv_level1(out2)

        return out1, out2, out3


class WBCE(nn.Module):
    """Weight-Based Cross Entropy Loss Function."""

    def __init__(self, weights=(0.8, 0.13, 0.07)):
        super(WBCE, self).__init__()
        self.criterion = nn.BCEWithLogitsLoss()
        self.weights = weights

    def forward(self, outputs, target):
        output1, output2, output3 = outputs

        # Ensure target size matches outputs
        target2 = F.interpolate(target, size=output2.size()[2:], mode="nearest")
        target3 = F.interpolate(target, size=output3.size()[2:], mode="nearest")

        loss1 = self.criterion(output1, target)
        loss2 = self.criterion(output2, target2)
        loss3 = self.criterion(output3, target3)

        total_loss = (
            self.weights[0] * loss1 + self.weights[1] * loss2 + self.weights[2] * loss3
        )

        return total_loss


class SegForest(nn.Module):
    """SegForest model for forest segmentation in remote sensing images."""

    def __init__(self, num_classes=1, pretrained=True):
        super(SegForest, self).__init__()

        # Load pretrained Segformer encoder
        self.encoder = SegformerModel.from_pretrained(
            "nvidia/segformer-b0-finetuned-ade-512-512"
        )

        # Feature dimensions from Segformer-B0
        hidden_sizes = [32, 64, 160, 256]

        # Multi-Feature Fusion modules
        self.mff1 = MFF(sum(hidden_sizes), hidden_sizes[0])
        self.mff2 = MFF(sum(hidden_sizes), hidden_sizes[1])
        self.mff3 = MFF(sum(hidden_sizes), hidden_sizes[2])

        # Multi-Scale Multi-Decoder
        self.msmd = MSMD(hidden_sizes[0], hidden_sizes[0] // 2, num_classes)

        # Initialize weights
        self._init_weights()

    def _init_weights(self):
        for m in self.modules():
            if isinstance(m, nn.Conv2d):
                nn.init.kaiming_normal_(m.weight, mode="fan_out", nonlinearity="relu")
                if m.bias is not None:
                    nn.init.constant_(m.bias, 0)
            elif isinstance(m, nn.BatchNorm2d):
                nn.init.constant_(m.weight, 1)
                nn.init.constant_(m.bias, 0)

    def resize_feature(self, feature, target, mode="down"):
        if mode == "down":
            return F.interpolate(
                feature, size=target.size()[2:], mode="bilinear", align_corners=False
            )
        else:  # up
            return F.interpolate(
                feature, size=target.size()[2:], mode="bilinear", align_corners=False
            )

    def forward(self, x):
        # Get feature maps from encoder
        encoder_outputs = self.encoder(x, output_hidden_states=True).hidden_states

        # Extract features from different levels
        feature1 = encoder_outputs[1]  # 1/4 resolution
        feature2 = encoder_outputs[2]  # 1/8 resolution
        feature3 = encoder_outputs[3]  # 1/16 resolution
        feature4 = encoder_outputs[4]  # 1/32 resolution

        # Convert hidden states to proper shape for CNN operations
        b, hw, c = feature1.shape
        h = w = int(hw**0.5)
        feature1 = feature1.transpose(1, 2).reshape(b, c, h, w)

        b, hw, c = feature2.shape
        h = w = int(hw**0.5)
        feature2 = feature2.transpose(1, 2).reshape(b, c, h, w)

        b, hw, c = feature3.shape
        h = w = int(hw**0.5)
        feature3 = feature3.transpose(1, 2).reshape(b, c, h, w)

        b, hw, c = feature4.shape
        h = w = int(hw**0.5)
        feature4 = feature4.transpose(1, 2).reshape(b, c, h, w)

        # Apply Multi-Feature Fusion
        # MFF for scale 1 (highest resolution)
        feature2_up = self.resize_feature(feature2, feature1, mode="up")
        feature3_up = self.resize_feature(feature3, feature1, mode="up")
        feature4_up = self.resize_feature(feature4, feature1, mode="up")
        mff_out1 = self.mff1(feature1, feature2_up, feature3_up, feature4_up)

        # MFF for scale 2
        feature1_down = self.resize_feature(feature1, feature2, mode="down")
        feature3_up = self.resize_feature(feature3, feature2, mode="up")
        feature4_up = self.resize_feature(feature4, feature2, mode="up")
        mff_out2 = self.mff2(feature1_down, feature2, feature3_up, feature4_up)

        # MFF for scale 3
        feature1_down = self.resize_feature(feature1, feature3, mode="down")
        feature2_down = self.resize_feature(feature2, feature3, mode="down")
        feature4_up = self.resize_feature(feature4, feature3, mode="up")
        mff_out3 = self.mff3(feature1_down, feature2_down, feature3, feature4_up)

        # Apply Multi-Scale Multi-Decoder
        out1, out2, out3 = self.msmd(mff_out1, mff_out2, mff_out3)

        # Resize outputs to input size for final output
        output = F.interpolate(
            out1, size=x.size()[2:], mode="bilinear", align_corners=False
        )

        if self.training:
            return output, out2, out3
        else:
            return output


# Example of how to use the model and loss function
def train_example():
    # Create model
    model = SegForest(num_classes=1)

    # Define loss function
    criterion = WBCE()

    # Create optimizer
    optimizer = torch.optim.AdamW(model.parameters(), lr=0.00006)

    # Example input (batch_size, channels, height, width)
    x = torch.randn(2, 3, 512, 512)

    # Example target (batch_size, num_classes, height, width)
    target = torch.randint(0, 2, (2, 1, 512, 512)).float()

    # Forward pass
    outputs = model(x)

    # Calculate loss
    loss = criterion(outputs, target)

    # Backward pass and optimize
    optimizer.zero_grad()
    loss.backward()
    optimizer.step()

    print(f"Loss: {loss.item()}")

    return model, loss


# Example of inference
def inference_example(model, image):
    model.eval()
    with torch.no_grad():
        output = model(image)

    # Apply sigmoid to get probability map
    pred = torch.sigmoid(output)

    # Binarize the prediction
    pred_binary = (pred > 0.5).float()

    return pred_binary
