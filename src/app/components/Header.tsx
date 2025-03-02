"use client";

import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
} from "@mui/material";
import { useRouter } from "next-nprogress-bar";
import { usePathname } from "next/navigation";
import ScienceIcon from "@mui/icons-material/Science";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();

  const pages = [
    { title: "Дневник", path: "/" },
    { title: "Добавки", path: "/supplements" },
  ];

  return (
    <AppBar position="sticky" color="primary" elevation={1}>
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              cursor: "pointer",
            }}
            onClick={() => router.push("/")}
          >
            <ScienceIcon sx={{ fontSize: 32, mr: 1 }} />
            <Typography
              variant="h5"
              noWrap
              sx={{
                fontWeight: 700,
                letterSpacing: ".1rem",
                color: "inherit",
                textDecoration: "none",
              }}
            >
              БИОФАКЕР
            </Typography>
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          <Box sx={{ display: "flex", gap: 1 }}>
            {pages.map((page) => (
              <Button
                key={page.path}
                onClick={() => router.push(page.path)}
                sx={{
                  color: "white",
                  display: "block",
                  fontWeight: pathname === page.path ? 700 : 400,
                  borderBottom:
                    pathname === page.path
                      ? "2px solid white"
                      : "2px solid transparent",
                  borderRadius: 0,
                  px: 2,
                  py: 2,
                  transition: "border-color 0.2s ease",
                  "&:hover": {
                    borderColor: "rgba(255, 255, 255, 0.5)",
                  },
                }}
              >
                {page.title}
              </Button>
            ))}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
