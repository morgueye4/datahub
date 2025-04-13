import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Badge, Button, Spinner, Alert } from 'react-bootstrap'
import { useWeb3 } from '../contexts/Web3Context'
import { useAuth } from '../contexts/AuthContext'
import { formatDate, truncateAddress } from '../utils/formatting'
import cidUtils from '../utils/cidUtils'
import { submissionsAPI, tasksAPI } from '../services/api'

const SubmissionDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { contracts } = useWeb3()
  const { user } = useAuth()

  const [submission, setSubmission] = useState(null)
  const [task, setTask] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchSubmissionAndTask = async () => {
      if (!id) {
        setError('Submission ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // First, get submission from our backend
        const backendSubmission = await submissionsAPI.getSubmissionById(id);
        console.log('Backend submission:', backendSubmission);

        if (!backendSubmission) {
          setError('Submission not found');
          setLoading(false);
          return;
        }

        // Get task data
        const taskData = await tasksAPI.getTaskById(backendSubmission.taskId);
        console.log('Task data:', taskData);
        setTask(taskData);

        // If we have a blockchain connection, fetch additional data
        if (contracts.submissionManager && backendSubmission.contractSubmissionId) {
          try {
            // Get blockchain data for this submission
            const blockchainData = await contracts.submissionManager.getSubmission(backendSubmission.contractSubmissionId);
            console.log('Blockchain data:', blockchainData);
            
            // Safely handle blockchain data
            const submissionData = {
              ...backendSubmission,
              isApproved: blockchainData?.isApproved ?? null,
              reviewCount: blockchainData?.reviewCount?.toNumber?.() ?? 0,
              createdAt: blockchainData?.createdAt?.toNumber?.() 
                ? new Date(blockchainData.createdAt.toNumber() * 1000)
                : new Date(backendSubmission.submittedAt)
            };
            
            setSubmission(submissionData);
          } catch (err) {
            console.error('Error fetching blockchain data:', err);
            // If the error is "Submission does not exist", it means the blockchain transaction is still pending
            if (err.message.includes('Submission does not exist')) {
              setSubmission({
                ...backendSubmission,
                isApproved: null,
                reviewCount: 0,
                createdAt: new Date(backendSubmission.submittedAt)
              });
            } else {
              // For other errors, use just the backend data
              setSubmission(backendSubmission);
            }
          }
        } else {
          // If no blockchain connection or no contractSubmissionId, just use backend data
          setSubmission(backendSubmission);
        }
      } catch (err) {
        console.error('Error fetching submission:', err);
        setError('Failed to load submission. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissionAndTask();
  }, [id, contracts.submissionManager]);

  // ... rest of the component code ...
} 