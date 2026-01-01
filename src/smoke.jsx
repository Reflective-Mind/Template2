
import React from 'react';
import { createRoot } from 'react-dom/client';

export default function Test() {
    return <div>Sanity Check</div>;
}

if (document.getElementById('root')) {
    createRoot(document.getElementById('root')).render(<Test />);
}
