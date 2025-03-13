// AboutUs component: Info about BlockSpeak
// Provides information about the BlockSpeak project and its mission.
import React from 'react';

function AboutUs() {
  return (
    <div className="bg-dark text-white min-h-screen p-4">
      <h1 className="text-4xl font-bold text-primary mb-4 text-center">About Us</h1>
      <p className="text-accent text-center max-w-2xl mx-auto">
        BlockSpeak empowers you to harness blockchain with no-code contracts and crypto insights.
      </p>
    </div>
  );
}

export default AboutUs;
