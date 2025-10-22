
import React from 'react';

const Loader: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center my-12">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-banana-yellow"></div>
      <p className="mt-4 text-brand-subtle">Crafting your vision...</p>
    </div>
  );
};

export default Loader;