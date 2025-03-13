// EmailSignup component: Collects emails for marketing
// A form to collect email addresses for marketing purposes (backend TBD).
import React, { useState } from 'react';

function EmailSignup() {
  const [email, setEmail] = useState('');
  const handleSignup = async (e) => {
    e.preventDefault();
    alert(`Email ${email} added to list! (Backend TBD)`);
    setEmail('');
  };
  return (
    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 rounded-lg shadow-lg text-center">
      <h2 className="text-xl font-bold text-white mb-2">Join Our Email List</h2>
      <form onSubmit={handleSignup} className="flex flex-col sm:flex-row gap-2 justify-center">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          className="p-2 text-dark rounded border border-accent"
          required
        />
        <button type="submit" className="bg-primary hover:bg-purple-700 text-white font-bold py-2 px-4 rounded">
          Sign Up
        </button>
      </form>
    </div>
  );
}

export default EmailSignup;
