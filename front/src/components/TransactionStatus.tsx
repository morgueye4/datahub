import React, { useEffect, useState } from 'react';

interface TransactionStatusProps {
  txHash: string;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

export const TransactionStatus: React.FC<TransactionStatusProps> = ({
  txHash,
  onComplete,
  onError
}) => {
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/transactions/${txHash}/status`);
        const data = await response.json();

        if (data.success) {
          setStatus(data.status);
          if (data.status === 'success' && onComplete) {
            onComplete();
          }
        } else {
          setStatus('error');
          setError(data.message);
          if (onError) {
            onError(new Error(data.message));
          }
        }
      } catch (err) {
        setStatus('error');
        setError('Failed to check transaction status');
        if (onError) {
          onError(err instanceof Error ? err : new Error('Unknown error'));
        }
      }
    };

    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [txHash, onComplete, onError]);

  return (
    <div className="d-flex align-items-center gap-2 p-2">
      {status === 'pending' && (
        <>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <span>Transaction pending...</span>
        </>
      )}
      {status === 'success' && (
        <>
          <i className="bi bi-check-circle-fill text-success"></i>
          <span>Transaction successful!</span>
        </>
      )}
      {status === 'error' && (
        <>
          <i className="bi bi-exclamation-circle-fill text-danger"></i>
          <div className="alert alert-danger" role="alert">
            {error || 'Transaction failed'}
          </div>
        </>
      )}
    </div>
  );
}; 