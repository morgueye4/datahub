from typing import List, Dict, Any, Optional
import numpy as np

class Dataset:
    """
    Class representing a dataset from the DataDAO platform.
    """
    
    def __init__(self, id: str, name: str, features: List[Any], labels: List[Any], metadata: Dict[str, Any]):
        """
        Initialize a dataset.
        
        Args:
            id: Dataset ID
            name: Dataset name
            features: Dataset features/inputs
            labels: Dataset labels/outputs
            metadata: Additional dataset metadata
        """
        self.id = id
        self.name = name
        self.features = features
        self.labels = labels
        self.metadata = metadata
    
    def __len__(self) -> int:
        """
        Get the number of samples in the dataset.
        
        Returns:
            Number of samples
        """
        return len(self.features)
    
    def __getitem__(self, idx):
        """
        Get a sample from the dataset.
        
        Args:
            idx: Index of the sample
            
        Returns:
            Tuple of (feature, label)
        """
        return self.features[idx], self.labels[idx]
    
    def to_numpy(self) -> tuple:
        """
        Convert the dataset to numpy arrays.
        
        Returns:
            Tuple of (features_array, labels_array)
        """
        return np.array(self.features), np.array(self.labels)
    
    def split(self, train_ratio: float = 0.8, shuffle: bool = True) -> tuple:
        """
        Split the dataset into training and testing sets.
        
        Args:
            train_ratio: Ratio of training data (0.0 to 1.0)
            shuffle: Whether to shuffle the data before splitting
            
        Returns:
            Tuple of (train_features, train_labels, test_features, test_labels)
        """
        n_samples = len(self)
        indices = np.arange(n_samples)
        
        if shuffle:
            np.random.shuffle(indices)
        
        split_idx = int(n_samples * train_ratio)
        train_indices = indices[:split_idx]
        test_indices = indices[split_idx:]
        
        train_features = [self.features[i] for i in train_indices]
        train_labels = [self.labels[i] for i in train_indices]
        test_features = [self.features[i] for i in test_indices]
        test_labels = [self.labels[i] for i in test_indices]
        
        return train_features, train_labels, test_features, test_labels
    
    def get_metadata(self) -> Dict[str, Any]:
        """
        Get the dataset metadata.
        
        Returns:
            Dataset metadata
        """
        return self.metadata
    
    def get_owner(self) -> str:
        """
        Get the dataset owner's address.
        
        Returns:
            Owner's blockchain address
        """
        return self.metadata.get("owner", "")
