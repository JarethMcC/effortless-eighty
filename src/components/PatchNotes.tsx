import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import patchNotesData from '../data/patchNotes.json';

interface PatchNote {
  version: string;
  date: string;
  title: string;
  description: string;
  changes: string[];
}

const PatchNotes: React.FC = () => {
  const [patchNotes, setPatchNotes] = useState<PatchNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load patch notes from the JSON file
    setPatchNotes(patchNotesData);
    setLoading(false);
  }, []);

  const formatDate = (dateString: string) => {
    // Split the date string "DD-MM-YYYY" into parts
    const parts = dateString.split('-');
    if (parts.length === 3) {
      // Create date as YYYY-MM-DD for reliable parsing by new Date()
      // Or directly construct: new Date(year, monthIndex, day)
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed in JS Date
      const year = parseInt(parts[2], 10);
      
      const dateObj = new Date(year, month, day);
      const options: Intl.DateTimeFormatOptions = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      };
      return dateObj.toLocaleDateString(undefined, options);
    }
    return dateString; // Fallback if format is unexpected
  };

  return (
    <div className="patch-notes-container card-style">
      <div className="patch-notes-navigation">
        <Link to="/" className="back-button">
          &larr; Back to Home
        </Link>
      </div>
      <h2>Patch Notes</h2>
      {loading ? (
        <p className="loading-text">Loading patch notes...</p>
      ) : (
        <div className="patch-notes-list">
          {patchNotes.map((note, index) => (
            <div key={index} className="patch-note-item">
              <div className="patch-note-header">
                <h3>v{note.version} - {note.title}</h3>
                <span className="patch-note-date">{formatDate(note.date)}</span>
              </div>
              <p className="patch-note-description">{note.description}</p>
              <ul className="patch-note-changes">
                {note.changes.map((change, changeIndex) => (
                  <li key={changeIndex}>{change}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PatchNotes;
