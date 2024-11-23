"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { Input } from "./ui/input";
import { SearchIcon } from "lucide-react";

interface SearchFieldProps {
  items: string[]; //list of items to search
  onResults: (filteredItems: string[]) => void; //return result to parent
  placeholder?: string;
}

export default function SearchField({
  items,
  onResults,
  placeholder = "Search...",
}: SearchFieldProps) {
  const [query, setQuery] = useState("");

    function handleSearch(text: string) {
        const filtered = items.filter((item) =>
            item.toLowerCase().includes(text.toLowerCase()),
          );

        return filtered;
    }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onResults(handleSearch(query));
  }

  function handleInput(event: ChangeEvent<HTMLInputElement>) {
    event.preventDefault();
    const nQuery = (event.target.value).trim();
    setQuery(nQuery);
    
    onResults(handleSearch(query));
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <Input
        type="search"
        name="query"
        onChange={handleInput}
        placeholder={placeholder} 
        className="pe-10"
      />
      <SearchIcon className="absolute right-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"/>
    </form>
  );
}
