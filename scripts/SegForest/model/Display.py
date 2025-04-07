import torch

# Load the .pt file
model_data = torch.load(
    "scripts\\SegForest\\model\\023_model_0.8181_0.6759.pt",
    map_location=torch.device("cpu"),
)

# Check what type of data is stored (dictionary, OrderedDict, or direct tensor)
print(f"Type of data in .pt file: {type(model_data)}")

# If it's a state dictionary (most common case)
if isinstance(model_data, dict):
    print(f"Number of layers/tensors: {len(model_data)}")
    print("\nFirst few layer names:")
    for i, (key, value) in enumerate(model_data.items()):
        if i >= 5:  # Print first 5 layer names
            break
        print(f"Layer: {key}, Shape: {value.shape}, Type: {value.dtype}")

    # Print first 100 values of the first layer
    first_key = next(iter(model_data))
    first_tensor = model_data[first_key]
    flat_tensor = first_tensor.flatten()

    print(f"\nFirst 100 values of layer '{first_key}':")
    print(flat_tensor[:100])

# If it's just a tensor
elif isinstance(model_data, torch.Tensor):
    print(f"Shape of tensor: {model_data.shape}")
    print(f"Data type: {model_data.dtype}")

    # Print first 100 values
    flat_tensor = model_data.flatten()
    print("\nFirst 100 values:")
    print(flat_tensor[:100])

# If it's a full model
else:
    print("This appears to be a full model object, not just weights.")
    print("Model structure:")
    print(model_data)
