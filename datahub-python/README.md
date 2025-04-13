# DataHub Python Library (Work in Progress)

This Python library provides a client for interacting with the DataHub platform, allowing users to:

- Join the platform and manage membership
- Create and participate in data collection and labeling tasks
- Access and monetize datasets
- Participate in community governance

## Installation

```bash
pip install datahub-client
```

## Requirements

- Python 3.7+
- Web3.py
- Lighthouse SDK

## Usage

### Initialize the client

```python
from datahub_client import DataHubClient

# Initialize with RPC URL and private key
client = DataHubClient(
    rpc_url="https://api.calibration.node.glif.io/rpc/v1",
    private_key="your_private_key",
    contract_registry_address="0x123...",
    lighthouse_api_key="your_lighthouse_api_key"
)
```

### Platform Membership

```python
# Join the platform by staking tokens
client.join_platform(amount=100 * 10**18)  # Stake 100 tokens

# Check membership status
is_member = client.is_member()
print(f"Is member: {is_member}")

# Get member details
member_info = client.get_member_info()
print(f"Member tier: {member_info['tier']}")
print(f"Reputation: {member_info['reputation']}")
```

### Task Management

```python
# Create a data collection task
task_result = client.create_task(
    title="Collect images of cats",
    description="We need high-quality images of cats for our dataset",
    task_type=0,  # 0 = DataCollection
    reward=10 * 10**18,  # 10 tokens per submission
    review_reward=2 * 10**18,  # 2 tokens per review
    required_submissions=10,
    required_validations=3,
    deadline=int(time.time()) + 7 * 24 * 60 * 60,  # 1 week from now
    privacy_level=0,  # 0 = Public
    access_conditions_cid="",
    instructions_cid="QmInstructions..."
)
task_id = task_result['task_id']

# Submit to a task
submission_result = client.submit_to_task(
    task_id=task_id,
    data_file_path="path/to/cat_image.jpg",
    encrypt=False
)
submission_id = submission_result['submission_id']

# Validate a submission
client.validate_submission(
    submission_id=submission_id,
    approved=True
)
```

### Dataset Management

```python
# Create a dataset
dataset_result = client.create_dataset(
    name="Cat Image Dataset",
    description="A collection of cat images",
    metadata_cid="QmMetadata...",
    data_cid="QmData...",
    is_encrypted=True,
    access_conditions_cid="QmAccessConditions...",
    access_type=3,  # 3 = Subscription
    price=50 * 10**18,  # 50 tokens per month
    task_ids=[task_id]
)
dataset_id = dataset_result['dataset_id']

# Purchase access to a dataset
client.purchase_dataset_access(
    dataset_id=dataset_id,
    duration=30 * 24 * 60 * 60  # 30 days
)

# Access a dataset
dataset_content = client.access_dataset(dataset_id=dataset_id)
```

### Governance

```python
# Create a proposal
proposal_result = client.create_proposal(
    title="Add new task type",
    description="We should add a new task type for audio data",
    proposal_type=0,  # 0 = General
    targets=["0x123..."],
    values=[0],
    calldatas=[b"..."],
    signatures=["function_signature(...)"]
)
proposal_id = proposal_result['proposal_id']

# Vote on a proposal
client.vote_on_proposal(
    proposal_id=proposal_id,
    vote_type=1  # 1 = For
)

# Execute a proposal
client.execute_proposal(proposal_id=proposal_id)
```

### Utility Functions

```python
# Get DAO statistics
stats = client.get_dao_stats()
print(f"Member count: {stats['member_count']}")
print(f"Task count: {stats['task_count']}")
print(f"Dataset count: {stats['dataset_count']}")

# Get token balance
balance = client.get_token_balance()
print(f"Token balance: {balance / 10**18} hubFIL")

# Claim tokens from faucet
client.claim_from_faucet()
```
