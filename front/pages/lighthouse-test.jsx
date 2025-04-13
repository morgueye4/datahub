import React from 'react';
import Layout from '../components/Layout.jsx';
import LighthouseUpload from '../components/LighthouseUpload.jsx';

const LighthouseTestPage = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Lighthouse Integration Test</h1>
        <p className="mb-6 text-gray-700">
          This page demonstrates the integration with Lighthouse for encrypted and unencrypted file storage on IPFS/Filecoin.
          You can upload files with or without encryption, and set access conditions for encrypted files.
        </p>

        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Note:</strong> When using encryption, you'll need to connect your wallet to sign the authentication message.
                Access conditions can be set to control who can decrypt and access the file.
              </p>
            </div>
          </div>
        </div>

        <LighthouseUpload />

        <div className="mt-12 bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">About Lighthouse Storage</h2>
          <p className="mb-4">
            Lighthouse is a permanent storage protocol that allows users to upload and store files on IPFS and Filecoin with
            built-in encryption and access control features.
          </p>

          <h3 className="text-lg font-medium mt-6 mb-2">Key Features:</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>Permanent storage on Filecoin network</li>
            <li>Kavach encryption for secure file storage</li>
            <li>Programmable access control conditions</li>
            <li>Token-gated access to files</li>
            <li>Time-based access controls</li>
            <li>Ability to share and revoke access</li>
          </ul>

          <h3 className="text-lg font-medium mt-6 mb-2">Access Control Examples:</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>Require users to hold a specific token</li>
            <li>Require users to be members of the DAO</li>
            <li>Limit access to specific wallet addresses</li>
            <li>Set time-based restrictions</li>
            <li>Combine multiple conditions with AND/OR logic</li>
          </ul>

          <p className="mt-6 text-sm text-gray-600">
            For more information, visit the <a href="https://docs.lighthouse.storage/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Lighthouse documentation</a>.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default LighthouseTestPage;
