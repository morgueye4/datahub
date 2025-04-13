import os
import time
from datadao_client import DataDAOClient

# Load environment variables
RPC_URL = os.getenv("RPC_URL", "https://api.calibration.node.glif.io/rpc/v1")
PRIVATE_KEY = os.getenv("PRIVATE_KEY", "")
CONTRACT_REGISTRY_ADDRESS = os.getenv("CONTRACT_REGISTRY_ADDRESS", "")
LIGHTHOUSE_API_KEY = os.getenv("LIGHTHOUSE_API_KEY", "")

def main():
    # Initialize the client
    client = DataDAOClient(
        rpc_url=RPC_URL,
        private_key=PRIVATE_KEY,
        contract_registry_address=CONTRACT_REGISTRY_ADDRESS,
        lighthouse_api_key=LIGHTHOUSE_API_KEY
    )
    
    # Get DAO statistics
    print("Getting DAO statistics...")
    stats = client.get_dao_stats()
    print(f"Member count: {stats['member_count']}")
    print(f"Task count: {stats['task_count']}")
    print(f"Dataset count: {stats['dataset_count']}")
    print(f"Proposal count: {stats['proposal_count']}")
    
    # Get token balance
    print("\nGetting token balance...")
    balance = client.get_token_balance()
    print(f"Token balance: {balance / 10**18} dataFIL")
    
    # Claim tokens from faucet if balance is low
    if balance < 100 * 10**18:
        print("\nClaiming tokens from faucet...")
        try:
            result = client.claim_from_faucet()
            print(f"Faucet claim successful: {result['claim_tx']['status']}")
            
            # Check new balance
            balance = client.get_token_balance()
            print(f"New token balance: {balance / 10**18} dataFIL")
        except Exception as e:
            print(f"Error claiming from faucet: {e}")
    
    # Check if user is a DAO member
    print("\nChecking DAO membership...")
    is_member = client.is_member()
    print(f"Is member: {is_member}")
    
    # Join the DAO if not a member
    if not is_member:
        print("\nJoining the DAO...")
        try:
            result = client.join_dao(amount=100 * 10**18)  # Stake 100 tokens
            print(f"DAO join successful: {result['join_tx']['status']}")
            
            # Check membership status again
            is_member = client.is_member()
            print(f"Is member now: {is_member}")
        except Exception as e:
            print(f"Error joining DAO: {e}")
    
    # Get member details if a member
    if is_member:
        print("\nGetting member details...")
        member_info = client.get_member_info()
        print(f"Member tier: {member_info['tier']}")
        print(f"Reputation: {member_info['reputation']}")
        print(f"Staked amount: {member_info['staked_amount'] / 10**18} dataFIL")
        print(f"Joined at: {time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(member_info['joined_at']))}")
    
    # Create a task
    print("\nCreating a data collection task...")
    try:
        task_result = client.create_task(
            title="Collect images of cats",
            description="We need high-quality images of cats for our dataset",
            task_type=0,  # 0 = DataCollection
            reward=10 * 10**18,  # 10 tokens per submission
            review_reward=2 * 10**18,  # 2 tokens per review
            required_submissions=5,
            required_validations=2,
            deadline=int(time.time()) + 7 * 24 * 60 * 60,  # 1 week from now
            privacy_level=0,  # 0 = Public
            access_conditions_cid="",
            instructions_cid=""
        )
        task_id = task_result['task_id']
        print(f"Task created with ID: {task_id}")
        
        # Get task details
        print("\nGetting task details...")
        task = client.get_task(task_id)
        print(f"Task title: {task['title']}")
        print(f"Task reward: {task['reward'] / 10**18} dataFIL")
        print(f"Required submissions: {task['required_submissions']}")
        print(f"Deadline: {time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(task['deadline']))}")
    except Exception as e:
        print(f"Error creating task: {e}")
    
    # List available datasets
    print("\nGetting dataset count...")
    dataset_count = stats['dataset_count']
    print(f"Total datasets: {dataset_count}")
    
    if dataset_count > 0:
        print("\nGetting details of the first dataset...")
        try:
            dataset = client.get_dataset(0)
            print(f"Dataset name: {dataset['name']}")
            print(f"Dataset description: {dataset['description']}")
            print(f"Dataset owner: {dataset['owner']}")
            print(f"Dataset price: {dataset['price'] / 10**18} dataFIL")
            print(f"Dataset access type: {dataset['access_type']}")
            print(f"Dataset validated: {dataset['validated']}")
        except Exception as e:
            print(f"Error getting dataset: {e}")
    
    # List active proposals
    print("\nGetting proposal count...")
    proposal_count = stats['proposal_count']
    print(f"Total proposals: {proposal_count}")
    
    if proposal_count > 0:
        print("\nGetting details of the first proposal...")
        try:
            proposal = client.get_proposal(0)
            print(f"Proposal title: {proposal['title']}")
            print(f"Proposal description: {proposal['description']}")
            print(f"Proposal status: {proposal['status']}")
            print(f"For votes: {proposal['for_votes'] / 10**18} dataFIL")
            print(f"Against votes: {proposal['against_votes'] / 10**18} dataFIL")
            print(f"End time: {time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(proposal['end_time']))}")
        except Exception as e:
            print(f"Error getting proposal: {e}")

if __name__ == "__main__":
    main()
