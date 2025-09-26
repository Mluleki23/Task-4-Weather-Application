// src/components/SearchBar.tsx
import React, { useState } from "react";

interface SearchBarProps {
  onSearch: (q: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const [input, setInput] = useState("");

  const submit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (input.trim().length === 0) return;
    onSearch(input.trim());
    setInput("");
  };

  return (
    <form onSubmit={submit} className="search-bar" style={{ margin: "0 auto" }}>
      <div className="search-input">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          style={{ opacity: 0.7 }}
        >
          <path
            fill="currentColor"
            d="M21 20l-5.6-5.6a7 7 0 10-1.4 1.4L20 21z"
          ></path>
        </svg>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search city, e.g. Johannesburg"
        />
      </div>
      <button type="submit" className="search-btn">
        Search
      </button>
    </form>
  );
};

export default SearchBar;
