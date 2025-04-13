import { useState, useEffect } from 'react'
import { Form, Button, Alert, Spinner, Row, Col, Badge, InputGroup, Card } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useWeb3 } from '../contexts/Web3Context'
import { ethers } from 'ethers'

const ProposalForm = ({ onProposalCreated }) => {
  const { isAuthenticated } = useAuth()
  const { contracts } = useWeb3()
  const navigate = useNavigate()

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [targetAddress, setTargetAddress] = useState('')
  const [selectedContract, setSelectedContract] = useState('')
  const [availableContracts, setAvailableContracts] = useState([])
  const [functionSignature, setFunctionSignature] = useState('')
  const [availableFunctions, setAvailableFunctions] = useState([])
  const [functionInputs, setFunctionInputs] = useState([])
  const [paramValues, setParamValues] = useState({})
  const [votingPeriod, setVotingPeriod] = useState(3) // Default 3 days

  // UI state
  const [step, setStep] = useState(1) // 1: Basic Info, 2: Target Contract, 3: Function Details, 4: Review
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  // Get available contracts when component mounts
  useEffect(() => {
    if (!contracts) return

    const contractList = []

    // Add all available contracts
    for (const [name, contract] of Object.entries(contracts)) {
      if (contract && contract.address) {
        contractList.push({
          name,
          address: contract.address
        })
      }
    }

    // Add option for custom contract address
    contractList.push({
      name: 'Custom Address',
      address: ''
    })

    setAvailableContracts(contractList)
  }, [contracts])

  // Get available functions when selected contract changes
  useEffect(() => {
    if (!selectedContract || selectedContract === 'Custom Address') {
      setAvailableFunctions([])
      setFunctionInputs([])
      return
    }

    const contract = contracts[selectedContract]
    if (!contract) return

    try {
      const functions = []

      // Get all functions from the contract interface
      for (const key in contract.interface.functions) {
        // Skip duplicates (overloaded functions)
        if (!functions.some(f => f.name === contract.interface.functions[key].name)) {
          // Only include functions that can modify state
          if (contract.interface.functions[key].stateMutability !== 'view' &&
              contract.interface.functions[key].stateMutability !== 'pure') {
            functions.push({
              name: contract.interface.functions[key].name,
              signature: key,
              inputs: contract.interface.functions[key].inputs,
              stateMutability: contract.interface.functions[key].stateMutability
            })
          }
        }
      }

      // Sort functions alphabetically
      functions.sort((a, b) => a.name.localeCompare(b.name))

      setAvailableFunctions(functions)

      // Reset function selection and parameters
      setFunctionSignature('')
      setFunctionInputs([])
      setParamValues({})
    } catch (err) {
      console.error('Error getting contract functions:', err)
      setAvailableFunctions([])
    }
  }, [contracts, selectedContract])

  // Update function inputs when function changes
  useEffect(() => {
    if (!functionSignature) {
      setFunctionInputs([])
      setParamValues({})
      return
    }

    const selectedFunction = availableFunctions.find(f => f.signature === functionSignature)
    if (selectedFunction) {
      setFunctionInputs(selectedFunction.inputs)

      // Initialize parameter values
      const initialValues = {}
      selectedFunction.inputs.forEach(input => {
        initialValues[input.name || input.type] = ''
      })
      setParamValues(initialValues)
    }
  }, [functionSignature, availableFunctions])

  // Handle parameter value change
  const handleParamChange = (name, value) => {
    setParamValues(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Handle form field changes
  const handleTitleChange = (e) => {
    setTitle(e.target.value)
  }

  const handleDescriptionChange = (e) => {
    setDescription(e.target.value)
  }

  const handleTargetAddressChange = (e) => {
    setTargetAddress(e.target.value)
  }

  const handleContractChange = (e) => {
    const contractName = e.target.value
    setSelectedContract(contractName)

    if (contractName === 'Custom Address') {
      setTargetAddress('')
    } else if (contracts[contractName]) {
      setTargetAddress(contracts[contractName].address)
    }
  }

  const handleFunctionChange = (e) => {
    setFunctionSignature(e.target.value)
  }

  const handleVotingPeriodChange = (e) => {
    setVotingPeriod(parseInt(e.target.value))
  }

  // Navigation between steps
  const nextStep = () => {
    setStep(prev => Math.min(prev + 1, 4))
  }

  const prevStep = () => {
    setStep(prev => Math.max(prev - 1, 1))
  }

  // Encode function call data
  const encodeFunctionData = () => {
    try {
      if (!functionSignature) return '0x'

      const selectedFunction = availableFunctions.find(f => f.signature === functionSignature)
      if (!selectedFunction) return '0x'

      // Prepare parameters
      const params = []
      for (const input of functionInputs) {
        const paramName = input.name || input.type
        const paramValue = paramValues[paramName]

        // Format parameter based on type
        let formattedValue = paramValue
        if (input.type.includes('int') && !input.type.includes('[]')) {
          // Handle integer types
          formattedValue = ethers.BigNumber.from(paramValue || '0')
        } else if (input.type === 'bool') {
          // Handle boolean type
          formattedValue = paramValue === 'true' || paramValue === true
        } else if (input.type.includes('[]')) {
          // Handle array types
          try {
            formattedValue = JSON.parse(paramValue || '[]')
          } catch (err) {
            console.error(`Invalid array for ${paramName}:`, err);
            throw new Error(`Invalid array for ${paramName}: ${err.message}. Use JSON format.`)
          }
        }

        params.push(formattedValue)
      }

      // Get the contract interface
      const contract = contracts[selectedContract]
      if (!contract) return '0x'

      // Encode the function call
      const encodedData = contract.interface.encodeFunctionData(selectedFunction.name, params)
      return encodedData
    } catch (err) {
      console.error('Error encoding function data:', err)
      return '0x'
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!isAuthenticated) {
      setError('Please connect your wallet first')
      return
    }

    // Validate form based on current step
    if (step === 1 && (!title || !description)) {
      setError('Please fill in all required fields')
      return
    } else if (step === 2 && !targetAddress) {
      setError('Please select a target contract or enter a custom address')
      return
    } else if (step === 3 && !functionSignature) {
      setError('Please select a function')
      return
    }

    // If not on the final step, just go to the next step
    if (step < 4) {
      nextStep()
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      if (!contracts.dataDAOGovernance) {
        throw new Error('DAO Governance contract not initialized')
      }

      // Calculate voting period in seconds
      const votingPeriodInSeconds = votingPeriod * 24 * 60 * 60

      // Encode function call data
      const callData = encodeFunctionData()

      console.log('Creating proposal with parameters:', {
        title,
        description,
        targetAddress,
        functionSignature,
        callData,
        votingPeriodInSeconds
      })

      // Get current gas price and add 50%
      const provider = contracts.dataDAOGovernance.provider
      const feeData = await provider.getFeeData()
      const gasPrice = feeData.gasPrice ? feeData.gasPrice.mul(150).div(100) : ethers.utils.parseUnits('50', 'gwei')

      console.log('Using gas price:', ethers.utils.formatUnits(gasPrice, 'gwei'), 'gwei')

      // Use the encoded function call data directly
      console.log('Encoded function call:', callData)

      // Estimate gas
      let gasEstimate
      try {
        gasEstimate = await contracts.dataDAOGovernance.estimateGas.createProposal(
          title,
          description,
          targetAddress,
          callData,
          votingPeriodInSeconds
        )
      } catch (err) {
        console.error('Error estimating gas:', err)
        // Use a default gas limit if estimation fails
        gasEstimate = ethers.BigNumber.from('500000')
      }

      console.log('Gas estimate:', gasEstimate.toString())

      // Create proposal on blockchain
      const tx = await contracts.dataDAOGovernance.createProposal(
        title,
        description,
        targetAddress,
        callData,
        votingPeriodInSeconds,
        {
          gasLimit: gasEstimate.mul(120).div(100), // Add 20% buffer
          gasPrice
        }
      )

      console.log('Transaction sent:', tx.hash)

      // Set success state
      setSuccess(true)

      // Wait for transaction to be mined
      const receipt = await tx.wait()
      console.log('Transaction mined:', receipt)

      // Get proposal ID from event
      const event = receipt.events.find(e => e.event === 'ProposalCreated')
      const proposalId = event ? event.args.proposalId.toNumber() : 0

      console.log('Proposal created with ID:', proposalId)

      // Reset form
      setTitle('')
      setDescription('')
      setTargetAddress('')
      setSelectedContract('')
      setFunctionSignature('')
      setParamValues({})
      setVotingPeriod(3)
      setStep(1)

      // Call the callback if provided
      if (onProposalCreated) {
        onProposalCreated(proposalId)
      }

      // Navigate to proposal details page or DAO page
      if (proposalId > 0) {
        navigate(`/dao/proposals/${proposalId}`)
      } else {
        navigate('/dao')
      }
    } catch (err) {
      console.error('Error creating proposal:', err)
      setError(`Failed to create proposal: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="proposal-form">
      <h3>Create New Proposal</h3>

      {error && <Alert variant="danger">{error}</Alert>}

      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3">
          <Form.Label>Title</Form.Label>
          <Form.Control
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder="Enter proposal title"
            required
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Description</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            value={description}
            onChange={handleDescriptionChange}
            placeholder="Provide a detailed description of the proposal"
            required
          />
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Target Contract Address</Form.Label>
          <Form.Control
            type="text"
            value={targetAddress}
            onChange={handleTargetAddressChange}
            placeholder="0x..."
            required
          />
          <Form.Text className="text-muted">
            The contract address that will be called if the proposal passes
          </Form.Text>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Function Signature</Form.Label>
          <Form.Control
            type="text"
            value={functionSignature}
            onChange={handleFunctionSignatureChange}
            placeholder="transfer(address,uint256)"
            required
          />
          <Form.Text className="text-muted">
            The function to call on the target contract (e.g., "transfer(address,uint256)")
          </Form.Text>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Call Data (optional)</Form.Label>
          <Form.Control
            type="text"
            value={callData}
            onChange={handleCallDataChange}
            placeholder="0x..."
          />
          <Form.Text className="text-muted">
            ABI-encoded parameters for the function call (hexadecimal format)
          </Form.Text>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Voting Period (days)</Form.Label>
          <Form.Control
            type="number"
            min="1"
            max="30"
            value={votingPeriod}
            onChange={handleVotingPeriodChange}
            required
          />
        </Form.Group>

        <Button
          variant="primary"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Spinner as="span" animation="border" size="sm" className="me-2" />
              Creating Proposal...
            </>
          ) : (
            'Create Proposal'
          )}
        </Button>
      </Form>
    </div>
  )
}

export default ProposalForm
