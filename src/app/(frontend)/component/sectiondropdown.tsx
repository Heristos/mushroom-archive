"use client";
import { useState } from "react";
import SquareBtn from "./squarebtn";

interface CategoriesProps {
  title: string;
  children: React.ReactNode;
}

export default function SectionDropdown({ title, children }: CategoriesProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="flex flex-col">
      <div
        className="flex items-center bg-(--color-main) p-3 h-14 
        shadow-[inset_3px_3px_0_var(--light-main),inset_-3px_-3px_0_var(--dark-main)]"
      >
        <span className="text-white font-semibold">{title}</span>
        <SquareBtn
          title={isOpen ? "-" : "+"}
          href="#"
          className="ml-auto"
          onClick={(e) => {
            e.preventDefault();
            setIsOpen(!isOpen);
          }}
        />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateRows: isOpen ? "1fr" : "0fr",
          opacity: isOpen ? 1 : 0,
          transition:
            "grid-template-rows 400ms ease-in-out, opacity 400ms ease-in-out",
        }}
      >
        <div style={{ overflow: "hidden" }}>
          <div className="flex flex-wrap justify-center gap-5 m-5">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
