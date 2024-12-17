"use client";

import { useState, useEffect } from "react";
import { getSupplements } from "../actions";
import { Supplement } from "../types";
import SupplementStats from "../components/SupplementStats";
import AddSupplement from "../components/AddSupplement";
import { Container, Box, Stack } from "@mui/material";

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
    <Box sx={{ py: 4 }}>
      <Container maxWidth="md">
        <Stack spacing={4}>
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
        </Stack>
      </Container>
    </Box>
  );
}
