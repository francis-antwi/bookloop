"use client";
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

const AuthErrorPage: NextPage = () => {
  const router = useRouter();
  const { error } = router.query;

  useEffect(() => {
    if (error === 'OAuthAccountNotLinked') {
      // You might want to redirect to a page explaining how to link accounts
      // or show a message to sign in with the original provider
    }
  }, [error]);

  return (
    <div className="error-container">
      {error === 'OAuthAccountNotLinked' ? (
        <div>
          <h1>Account Not Linked</h1>
          <p>
            This email is already associated with another account. 
            Please sign in with the original provider or contact support.
          </p>
        </div>
      ) : (
        <div>
          <h1>Authentication Error</h1>
          <p>An unexpected error occurred during sign-in.</p>
        </div>
      )}
    </div>
  );
};

export default AuthErrorPage;