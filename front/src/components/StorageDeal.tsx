import React, { useState } from 'react';
import { TransactionStatus } from './TransactionStatus';

interface StorageDealProps {
  dataCid: string;
  onDealCreated?: (dealId: string) => void;
}

export const StorageDeal: React.FC<StorageDealProps> = ({
  dataCid,
  onDealCreated
}) => {
  const [size, setSize] = useState<string>('');
  const [duration, setDuration] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [activeDeals, setActiveDeals] = useState<any[]>([]);

  const handleCreateDeal = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/storage/deals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dataCid,
          size: parseInt(size),
          duration: parseInt(duration),
          price
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to create storage deal');
      }

      setTxHash(data.data.txHash);
      if (onDealCreated) {
        onDealCreated(data.data.dealId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create storage deal');
    } finally {
      setLoading(false);
    }
  };

  const loadActiveDeals = async () => {
    try {
      const response = await fetch('/api/storage/deals/active');
      const data = await response.json();

      if (data.success) {
        setActiveDeals(data.data);
      }
    } catch (err) {
      console.error('Error loading active deals:', err);
    }
  };

  return (
    <div className="p-3">
      <h5 className="mb-3">Create Storage Deal</h5>

      <div className="d-flex flex-column gap-3 mb-4">
        <div className="form-group">
          <label htmlFor="dataCid">Data CID</label>
          <input
            type="text"
            className="form-control"
            id="dataCid"
            value={dataCid}
            disabled
          />
        </div>
        <div className="form-group">
          <label htmlFor="size">Size (bytes)</label>
          <input
            type="number"
            className="form-control"
            id="size"
            value={size}
            onChange={(e) => setSize(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="duration">Duration (blocks)</label>
          <input
            type="number"
            className="form-control"
            id="duration"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="price">Price (FIL)</label>
          <input
            type="number"
            className="form-control"
            id="price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        <button
          className="btn btn-primary"
          onClick={handleCreateDeal}
          disabled={loading || !size || !duration || !price}
        >
          {loading ? (
            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
          ) : (
            'Create Deal'
          )}
        </button>

        {txHash && (
          <TransactionStatus
            txHash={txHash}
            onComplete={loadActiveDeals}
            onError={(err) => setError(err.message)}
          />
        )}
      </div>

      <h5 className="mb-3">Active Deals</h5>

      <div className="table-responsive">
        <table className="table">
          <thead>
            <tr>
              <th>Deal ID</th>
              <th>Data CID</th>
              <th>Size</th>
              <th>Duration</th>
              <th>Provider</th>
            </tr>
          </thead>
          <tbody>
            {activeDeals.map((deal) => (
              <tr key={deal.contractDealId}>
                <td>{deal.contractDealId}</td>
                <td>{deal.dataCid}</td>
                <td>{deal.size}</td>
                <td>{deal.duration}</td>
                <td>{deal.provider}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}; 