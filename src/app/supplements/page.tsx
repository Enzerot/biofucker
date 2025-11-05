"use client";

import { useState, useEffect } from "react";
import { getSupplements } from "../actions";
import { Supplement } from "../types";
import SupplementStats from "../components/SupplementStats";
import AddSupplement from "../components/AddSupplement";

export default function SupplementsPage() {
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [editingSupplement, setEditingSupplement] = useState<
    Supplement | undefined
  >(undefined);

  const loadData = async () => {
    const newSupplements = await getSupplements();
    setSupplements(newSupplements);
  };

  useEffect(() => {
    loadData();
  }, []);

  const onDataChange = () => {
    loadData();
  };

  const handleEdit = (supplement: Supplement) => {
    setEditingSupplement(supplement);
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  };

  return (
    <div className="py-8">
      <div className="container mx-auto max-w-4xl px-4">
        <div className="space-y-8">
          <AddSupplement
            onSuccess={onDataChange}
            editSupplement={editingSupplement}
            onCancelEdit={() => setEditingSupplement(undefined)}
          />
          <SupplementStats
            supplements={supplements}
            onSuccess={onDataChange}
            onEdit={handleEdit}
          />
        </div>
      </div>
    </div>
  );
}
