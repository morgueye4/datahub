import json
import os
import requests
from web3 import Web3
from eth_account import Account
from eth_account.signers.local import LocalAccount
from typing import Dict, List, Optional, Tuple, Union, Any
import lighthouse
from lighthouse.upload import upload_file_to_lighthouse, upload_text_to_lighthouse
from lighthouse.download import download_file_from_lighthouse
from lighthouse.decrypt import decrypt_file
from lighthouse.kavach import get_jwt_token, sign_auth_message

class DataDAOClient:
    """
    Python client for interacting with the DataDAO platform.
    """
    
    def __init__(
        self, 
        rpc_url: str, 
        private_key: Optional[str] = None,
        contract_registry_address: Optional[str] = None,
        lighthouse_api_key: Optional[str] = None
    ):
        """
        Initialize the DataDAO client.
        
        Args:
            rpc_url: The RPC URL for the Filecoin network
            private_key: The private key for the user's wallet (optional)
            contract_registry_address: The address of the ContractRegistry contract (optional)
            lighthouse_api_key: The API key for Lighthouse (optional)
        """
        self.w3 = Web3(Web3.HTTPProvider(rpc_url))
        self.account = Account.from_key(private_key) if private_key else None
        self.contract_registry_address = contract_registry_address
        self.lighthouse_api_key = lighthouse_api_key
        self.contracts = {}
        
        # Load contract ABIs
        self.abis = {}
        abi_dir = os.path.join(os.path.dirname(__file__), 'abis')
        for filename in os.listdir(abi_dir):
            if filename.endswith('.json'):
                contract_name = filename.split('.')[0]
                with open(os.path.join(abi_dir, filename), 'r') as f:
                    self.abis[contract_name] = json.load(f)
        
        # Initialize contracts if registry address is provided
        if contract_registry_address:
            self._init_contracts()
    
    def _init_contracts(self):
        """
        Initialize contract instances from the registry.
        """
        if not self.contract_registry_address:
            raise ValueError("Contract registry address not provided")
        
        # Initialize ContractRegistry
        self.contracts['ContractRegistry'] = self.w3.eth.contract(
            address=self.contract_registry_address,
            abi=self.abis['ContractRegistry']
        )
        
        # Get contract addresses from registry
        contract_names = [
            'DataDAOCore',
            'MembershipManager',
            'TaskManager',
            'DatasetRegistry',
            'RewardDistributor',
            'DealClient',
            'DataToken',
            'GovernanceModule'
        ]
        
        for name in contract_names:
            try:
                address = self.contracts['ContractRegistry'].functions.getContractAddress(name).call()
                if address != '0x0000000000000000000000000000000000000000':
                    self.contracts[name] = self.w3.eth.contract(
                        address=address,
                        abi=self.abis[name]
                    )
            except Exception as e:
                print(f"Error initializing {name} contract: {e}")
    
    def set_contract_registry(self, address: str):
        """
        Set the contract registry address and initialize contracts.
        
        Args:
            address: The address of the ContractRegistry contract
        """
        self.contract_registry_address = address
        self._init_contracts()
    
    def set_private_key(self, private_key: str):
        """
        Set the private key for the user's wallet.
        
        Args:
            private_key: The private key for the user's wallet
        """
        self.account = Account.from_key(private_key)
    
    def set_lighthouse_api_key(self, api_key: str):
        """
        Set the API key for Lighthouse.
        
        Args:
            api_key: The API key for Lighthouse
        """
        self.lighthouse_api_key = api_key
    
    def _get_contract(self, name: str):
        """
        Get a contract instance by name.
        
        Args:
            name: The name of the contract
            
        Returns:
            The contract instance
        """
        if name not in self.contracts:
            raise ValueError(f"Contract {name} not initialized")
        return self.contracts[name]
    
    def _build_and_send_tx(self, contract_function, value: int = 0):
        """
        Build and send a transaction.
        
        Args:
            contract_function: The contract function to call
            value: The amount of ETH to send with the transaction
            
        Returns:
            The transaction receipt
        """
        if not self.account:
            raise ValueError("Private key not provided")
        
        tx = contract_function.build_transaction({
            'from': self.account.address,
            'nonce': self.w3.eth.get_transaction_count(self.account.address),
            'gas': 2000000,  # Adjust as needed
            'gasPrice': self.w3.eth.gas_price,
            'value': value
        })
        
        signed_tx = self.account.sign_transaction(tx)
        tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        return self.w3.eth.wait_for_transaction_receipt(tx_hash)
    
    # DAO Membership Functions
    
    def join_dao(self, amount: int) -> Dict:
        """
        Join the DAO by staking tokens.
        
        Args:
            amount: The amount of tokens to stake
            
        Returns:
            The transaction receipt
        """
        membership_manager = self._get_contract('MembershipManager')
        data_token = self._get_contract('DataToken')
        
        # Approve token transfer
        approve_tx = self._build_and_send_tx(
            data_token.functions.approve(membership_manager.address, amount)
        )
        
        # Join DAO
        join_tx = self._build_and_send_tx(
            membership_manager.functions.joinDAO(amount)
        )
        
        return {
            'approve_tx': dict(approve_tx),
            'join_tx': dict(join_tx)
        }
    
    def get_member_info(self, address: Optional[str] = None) -> Dict:
        """
        Get information about a DAO member.
        
        Args:
            address: The address of the member (defaults to the current account)
            
        Returns:
            Member information
        """
        if not address and self.account:
            address = self.account.address
        
        if not address:
            raise ValueError("Address not provided")
        
        membership_manager = self._get_contract('MembershipManager')
        
        member_info = membership_manager.functions.getMember(address).call()
        
        return {
            'exists': member_info[0],
            'tier': member_info[1],
            'reputation': member_info[2],
            'staked_amount': member_info[3],
            'joined_at': member_info[4],
            'last_activity_at': member_info[5]
        }
    
    def is_member(self, address: Optional[str] = None) -> bool:
        """
        Check if an address is a DAO member.
        
        Args:
            address: The address to check (defaults to the current account)
            
        Returns:
            True if the address is a member, False otherwise
        """
        if not address and self.account:
            address = self.account.address
        
        if not address:
            raise ValueError("Address not provided")
        
        dao_core = self._get_contract('DataDAOCore')
        return dao_core.functions.isMember(address).call()
    
    # Task Management Functions
    
    def create_task(
        self,
        title: str,
        description: str,
        task_type: int,
        reward: int,
        review_reward: int,
        required_submissions: int,
        required_validations: int,
        deadline: int,
        privacy_level: int,
        access_conditions_cid: str,
        instructions_cid: str
    ) -> Dict:
        """
        Create a new task.
        
        Args:
            title: The title of the task
            description: The description of the task
            task_type: The type of the task (0=DataCollection, 1=DataLabeling, 2=DataValidation, 3=DataCuration)
            reward: The reward amount for the task
            review_reward: The reward amount for reviewers
            required_submissions: The number of required submissions
            required_validations: The number of required validations per submission
            deadline: The deadline for the task (Unix timestamp)
            privacy_level: The privacy level of the task (0=Public, 1=Private, 2=Restricted)
            access_conditions_cid: The CID of the access conditions (for private tasks)
            instructions_cid: The CID of the task instructions
            
        Returns:
            The transaction receipt
        """
        task_manager = self._get_contract('TaskManager')
        data_token = self._get_contract('DataToken')
        
        # Calculate total reward
        total_reward = reward * required_submissions + review_reward * required_submissions * required_validations
        
        # Approve token transfer
        approve_tx = self._build_and_send_tx(
            data_token.functions.approve(task_manager.address, total_reward)
        )
        
        # Create task
        create_tx = self._build_and_send_tx(
            task_manager.functions.createTask(
                title,
                description,
                task_type,
                reward,
                review_reward,
                required_submissions,
                required_validations,
                deadline,
                privacy_level,
                access_conditions_cid,
                instructions_cid
            )
        )
        
        # Get task ID from event logs
        task_id = None
        for log in create_tx['logs']:
            if log['address'].lower() == task_manager.address.lower():
                try:
                    event = task_manager.events.TaskCreated().process_log(log)
                    task_id = event['args']['taskId']
                    break
                except:
                    pass
        
        return {
            'approve_tx': dict(approve_tx),
            'create_tx': dict(create_tx),
            'task_id': task_id
        }
    
    def submit_to_task(
        self,
        task_id: int,
        data_file_path: Optional[str] = None,
        data_text: Optional[str] = None,
        encrypt: bool = False,
        access_conditions: Optional[Dict] = None
    ) -> Dict:
        """
        Submit to a task.
        
        Args:
            task_id: The ID of the task
            data_file_path: The path to the data file (optional)
            data_text: The data text (optional)
            encrypt: Whether to encrypt the submission
            access_conditions: The access conditions for the submission (required if encrypt=True)
            
        Returns:
            The transaction receipt
        """
        if not self.lighthouse_api_key:
            raise ValueError("Lighthouse API key not provided")
        
        if not data_file_path and not data_text:
            raise ValueError("Either data_file_path or data_text must be provided")
        
        if encrypt and not access_conditions:
            raise ValueError("Access conditions must be provided for encrypted submissions")
        
        # Upload to Lighthouse
        if data_file_path:
            if encrypt:
                # Get JWT token for authentication
                jwt_token = get_jwt_token(self.account.key.hex(), self.lighthouse_api_key)
                
                # Upload encrypted file
                upload_response = upload_file_to_lighthouse(
                    data_file_path,
                    self.lighthouse_api_key,
                    encrypt=True,
                    access_conditions=access_conditions,
                    auth_token=jwt_token
                )
            else:
                # Upload unencrypted file
                upload_response = upload_file_to_lighthouse(
                    data_file_path,
                    self.lighthouse_api_key
                )
        else:
            if encrypt:
                # Get JWT token for authentication
                jwt_token = get_jwt_token(self.account.key.hex(), self.lighthouse_api_key)
                
                # Upload encrypted text
                upload_response = upload_text_to_lighthouse(
                    data_text,
                    self.lighthouse_api_key,
                    encrypt=True,
                    access_conditions=access_conditions,
                    auth_token=jwt_token
                )
            else:
                # Upload unencrypted text
                upload_response = upload_text_to_lighthouse(
                    data_text,
                    self.lighthouse_api_key
                )
        
        # Get CID from upload response
        cid = upload_response.get('data', {}).get('Hash')
        if not cid:
            raise ValueError(f"Failed to upload to Lighthouse: {upload_response}")
        
        # Submit to task
        task_manager = self._get_contract('TaskManager')
        submit_tx = self._build_and_send_tx(
            task_manager.functions.submitToTask(
                task_id,
                cid,
                encrypt
            )
        )
        
        # Get submission ID from event logs
        submission_id = None
        for log in submit_tx['logs']:
            if log['address'].lower() == task_manager.address.lower():
                try:
                    event = task_manager.events.SubmissionCreated().process_log(log)
                    submission_id = event['args']['submissionId']
                    break
                except:
                    pass
        
        return {
            'upload_response': upload_response,
            'cid': cid,
            'submit_tx': dict(submit_tx),
            'submission_id': submission_id
        }
    
    def validate_submission(self, submission_id: int, approved: bool) -> Dict:
        """
        Validate a submission.
        
        Args:
            submission_id: The ID of the submission
            approved: Whether the submission is approved
            
        Returns:
            The transaction receipt
        """
        task_manager = self._get_contract('TaskManager')
        validate_tx = self._build_and_send_tx(
            task_manager.functions.validateSubmission(
                submission_id,
                approved
            )
        )
        
        return {
            'validate_tx': dict(validate_tx)
        }
    
    # Dataset Management Functions
    
    def create_dataset(
        self,
        name: str,
        description: str,
        metadata_cid: str,
        data_cid: str,
        is_encrypted: bool,
        access_conditions_cid: str,
        access_type: int,
        price: int,
        task_ids: List[int]
    ) -> Dict:
        """
        Create a new dataset.
        
        Args:
            name: The name of the dataset
            description: The description of the dataset
            metadata_cid: The CID of the dataset metadata
            data_cid: The CID of the dataset
            is_encrypted: Whether the dataset is encrypted
            access_conditions_cid: The CID of the access conditions
            access_type: The access type of the dataset (0=Public, 1=TokenGated, 2=NFTGated, 3=Subscription, 4=PayPerUse)
            price: The price of the dataset
            task_ids: The IDs of tasks that contributed to this dataset
            
        Returns:
            The transaction receipt
        """
        dataset_registry = self._get_contract('DatasetRegistry')
        create_tx = self._build_and_send_tx(
            dataset_registry.functions.createDataset(
                name,
                description,
                metadata_cid,
                data_cid,
                is_encrypted,
                access_conditions_cid,
                access_type,
                price,
                task_ids
            )
        )
        
        # Get dataset ID from event logs
        dataset_id = None
        for log in create_tx['logs']:
            if log['address'].lower() == dataset_registry.address.lower():
                try:
                    event = dataset_registry.events.DatasetCreated().process_log(log)
                    dataset_id = event['args']['datasetId']
                    break
                except:
                    pass
        
        return {
            'create_tx': dict(create_tx),
            'dataset_id': dataset_id
        }
    
    def purchase_dataset_access(self, dataset_id: int, duration: int = 0) -> Dict:
        """
        Purchase access to a dataset.
        
        Args:
            dataset_id: The ID of the dataset
            duration: The duration of the subscription (in seconds, only for subscription access type)
            
        Returns:
            The transaction receipt
        """
        dataset_registry = self._get_contract('DatasetRegistry')
        data_token = self._get_contract('DataToken')
        
        # Get dataset details
        dataset = dataset_registry.functions.getDataset(dataset_id).call()
        price = dataset[9]  # Price is at index 9
        
        # Approve token transfer
        approve_tx = self._build_and_send_tx(
            data_token.functions.approve(dataset_registry.address, price)
        )
        
        # Purchase access
        purchase_tx = self._build_and_send_tx(
            dataset_registry.functions.purchaseAccess(
                dataset_id,
                duration
            )
        )
        
        return {
            'approve_tx': dict(approve_tx),
            'purchase_tx': dict(purchase_tx)
        }
    
    def access_dataset(self, dataset_id: int) -> Dict:
        """
        Access a dataset.
        
        Args:
            dataset_id: The ID of the dataset
            
        Returns:
            The dataset content
        """
        if not self.lighthouse_api_key:
            raise ValueError("Lighthouse API key not provided")
        
        dataset_registry = self._get_contract('DatasetRegistry')
        
        # Check if user has access
        has_access = dataset_registry.functions.hasAccess(
            dataset_id,
            self.account.address
        ).call()
        
        if not has_access:
            raise ValueError(f"No access to dataset {dataset_id}")
        
        # Get dataset details
        dataset = dataset_registry.functions.getDataset(dataset_id).call()
        data_cid = dataset[5]  # dataCID is at index 5
        is_encrypted = dataset[6]  # isEncrypted is at index 6
        
        # Record usage (only for pay-per-use datasets)
        if dataset[8] == 4:  # accessType is at index 8, 4 = PayPerUse
            data_token = self._get_contract('DataToken')
            
            # Approve token transfer
            approve_tx = self._build_and_send_tx(
                data_token.functions.approve(dataset_registry.address, dataset[9])  # price is at index 9
            )
            
            # Record usage
            dao_core = self._get_contract('DataDAOCore')
            record_tx = self._build_and_send_tx(
                dao_core.functions.recordDatasetUsage(
                    dataset_id,
                    self.account.address
                )
            )
        
        # Download from Lighthouse
        if is_encrypted:
            # Get JWT token for authentication
            jwt_token = get_jwt_token(self.account.key.hex(), self.lighthouse_api_key)
            
            # Download and decrypt
            content = decrypt_file(
                data_cid,
                self.account.key.hex(),
                self.lighthouse_api_key,
                auth_token=jwt_token
            )
        else:
            # Download unencrypted
            content = download_file_from_lighthouse(data_cid)
        
        return {
            'dataset_id': dataset_id,
            'data_cid': data_cid,
            'content': content
        }
    
    # Governance Functions
    
    def create_proposal(
        self,
        title: str,
        description: str,
        proposal_type: int,
        targets: List[str],
        values: List[int],
        calldatas: List[bytes],
        signatures: List[str]
    ) -> Dict:
        """
        Create a governance proposal.
        
        Args:
            title: The title of the proposal
            description: The description of the proposal
            proposal_type: The type of the proposal (0=General, 1=TaskCreation, 2=DatasetValidation, 3=MembershipRule, 4=Treasury, 5=ContractUpgrade)
            targets: The target addresses for calls to be made
            values: The values to be passed to the calls
            calldatas: The calldatas to be passed to the calls
            signatures: The signatures for the calls
            
        Returns:
            The transaction receipt
        """
        governance_module = self._get_contract('GovernanceModule')
        propose_tx = self._build_and_send_tx(
            governance_module.functions.propose(
                title,
                description,
                proposal_type,
                targets,
                values,
                calldatas,
                signatures
            )
        )
        
        # Get proposal ID from event logs
        proposal_id = None
        for log in propose_tx['logs']:
            if log['address'].lower() == governance_module.address.lower():
                try:
                    event = governance_module.events.ProposalCreated().process_log(log)
                    proposal_id = event['args']['proposalId']
                    break
                except:
                    pass
        
        return {
            'propose_tx': dict(propose_tx),
            'proposal_id': proposal_id
        }
    
    def vote_on_proposal(self, proposal_id: int, vote_type: int) -> Dict:
        """
        Vote on a governance proposal.
        
        Args:
            proposal_id: The ID of the proposal
            vote_type: The type of vote (1=For, 2=Against, 3=Abstain)
            
        Returns:
            The transaction receipt
        """
        governance_module = self._get_contract('GovernanceModule')
        vote_tx = self._build_and_send_tx(
            governance_module.functions.castVote(
                proposal_id,
                vote_type
            )
        )
        
        return {
            'vote_tx': dict(vote_tx)
        }
    
    def execute_proposal(self, proposal_id: int) -> Dict:
        """
        Execute a governance proposal.
        
        Args:
            proposal_id: The ID of the proposal
            
        Returns:
            The transaction receipt
        """
        governance_module = self._get_contract('GovernanceModule')
        execute_tx = self._build_and_send_tx(
            governance_module.functions.executeProposal(
                proposal_id
            )
        )
        
        return {
            'execute_tx': dict(execute_tx)
        }
    
    # Utility Functions
    
    def get_dao_stats(self) -> Dict:
        """
        Get DAO statistics.
        
        Returns:
            DAO statistics
        """
        dao_core = self._get_contract('DataDAOCore')
        stats = dao_core.functions.getDAOStats().call()
        
        return {
            'member_count': stats[0],
            'task_count': stats[1],
            'dataset_count': stats[2],
            'proposal_count': stats[3]
        }
    
    def get_task(self, task_id: int) -> Dict:
        """
        Get task details.
        
        Args:
            task_id: The ID of the task
            
        Returns:
            Task details
        """
        task_manager = self._get_contract('TaskManager')
        task = task_manager.functions.getTask(task_id).call()
        
        return {
            'id': task[0],
            'creator': task[1],
            'title': task[2],
            'description': task[3],
            'task_type': task[4],
            'status': task[5],
            'reward': task[6],
            'review_reward': task[7],
            'required_submissions': task[8],
            'required_validations': task[9],
            'deadline': task[10],
            'privacy_level': task[11],
            'access_conditions_cid': task[12],
            'data_cid': task[13],
            'instructions_cid': task[14],
            'created_at': task[15],
            'completed_at': task[16],
            'submission_count': task[17],
            'validated_submission_count': task[18]
        }
    
    def get_dataset(self, dataset_id: int) -> Dict:
        """
        Get dataset details.
        
        Args:
            dataset_id: The ID of the dataset
            
        Returns:
            Dataset details
        """
        dataset_registry = self._get_contract('DatasetRegistry')
        dataset = dataset_registry.functions.getDataset(dataset_id).call()
        
        return {
            'id': dataset[0],
            'name': dataset[1],
            'description': dataset[2],
            'owner': dataset[3],
            'metadata_cid': dataset[4],
            'data_cid': dataset[5],
            'is_encrypted': dataset[6],
            'access_conditions_cid': dataset[7],
            'access_type': dataset[8],
            'price': dataset[9],
            'created_at': dataset[10],
            'has_filecoin_deal': dataset[11],
            'deal_id': dataset[12],
            'validated': dataset[13],
            'usage_count': dataset[14],
            'revenue': dataset[15]
        }
    
    def get_proposal(self, proposal_id: int) -> Dict:
        """
        Get proposal details.
        
        Args:
            proposal_id: The ID of the proposal
            
        Returns:
            Proposal details
        """
        governance_module = self._get_contract('GovernanceModule')
        proposal = governance_module.functions.getProposal(proposal_id).call()
        
        return {
            'id': proposal[0],
            'proposer': proposal[1],
            'title': proposal[2],
            'description': proposal[3],
            'proposal_type': proposal[4],
            'status': proposal[5],
            'start_time': proposal[6],
            'end_time': proposal[7],
            'for_votes': proposal[8],
            'against_votes': proposal[9],
            'abstain_votes': proposal[10],
            'executed': proposal[11]
        }
    
    def claim_from_faucet(self) -> Dict:
        """
        Claim tokens from the faucet.
        
        Returns:
            The transaction receipt
        """
        data_token = self._get_contract('DataToken')
        claim_tx = self._build_and_send_tx(
            data_token.functions.claimFromFaucet()
        )
        
        return {
            'claim_tx': dict(claim_tx)
        }
    
    def get_token_balance(self, address: Optional[str] = None) -> int:
        """
        Get the token balance of an address.
        
        Args:
            address: The address to check (defaults to the current account)
            
        Returns:
            The token balance
        """
        if not address and self.account:
            address = self.account.address
        
        if not address:
            raise ValueError("Address not provided")
        
        data_token = self._get_contract('DataToken')
        return data_token.functions.balanceOf(address).call()
