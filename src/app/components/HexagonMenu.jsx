"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  AppBar,
  Toolbar,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Collapse,
} from "@mui/material";
import {
  Home,
  Description,
  Assignment,
  VerifiedUser,
  Settings,
  ExpandLess,
  ExpandMore,
  Add,
  Visibility,
  Create,
  List as ListIcon,
  Logout,
} from "@mui/icons-material";
import { useRouter } from "next/navigation";

const drawerWidth = 280;

const AUTH_STORAGE_KEYS = [
  "infoUser",
  "user",
  "isAuthenticated",
  "isAdmin",
  "usuario",
  "sessionExpiresAt",
];

function clearAuthClientStorage() {
  AUTH_STORAGE_KEYS.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  });
  try {
    sessionStorage.clear();
  } catch {
    /* ignore */
  }
}

function buildMenuItems(isAdmin) {
  const all = [
    {
      id: "inicio",
      title: "Inicio",
      icon: Home,
      description: "Panel principal",
      route: "/dashboard",
    },
    {
      id: "documentos",
      title: "Documentos",
      icon: Description,
      description: "Gestión de documentos",
      hasSubmenu: true,
      submenu: [
        {
          id: "nuevo-documento",
          title: "Nuevo Documento",
          icon: Add,
          route: "/dashboard/nuevo_documento",
        },
        {
          id: "visualizar-documentos",
          title: "Visualizar Documentos",
          icon: Visibility,
          route: "/dashboard/documentos",
        },
      ],
    },
    {
      id: "solicitudes",
      title: "Solicitudes",
      icon: Assignment,
      description: "Gestión de solicitudes",
      hasSubmenu: true,
      submenu: [
        {
          id: "crear-solicitud",
          title: "Crear Solicitud",
          icon: Create,
          route: "/dashboard/solicitudes/crear",
        },
        {
          id: "ver-solicitudes",
          title: "Ver Solicitudes",
          icon: ListIcon,
          route: "/dashboard/solicitudes",
        },
      ],
    },
    {
      id: "autorizaciones",
      title: "Autorizaciones",
      icon: VerifiedUser,
      description: "Gestionar autorizaciones",
      route: "/dashboard/autorizaciones",
    },
    {
      id: "configuracion",
      title: "Configuración",
      icon: Settings,
      description: "Ajustes del sistema",
      route: "/dashboard/configuracion",
    },
  ];

  if (isAdmin) return all;

  return all
    .filter((item) => item.id !== "configuracion")
    .map((item) => {
      if (item.id === "documentos" && item.hasSubmenu && item.submenu) {
        return {
          ...item,
          submenu: item.submenu.filter((s) => s.id !== "nuevo-documento"),
        };
      }
      return item;
    });
}

function HexagonMenu({ selectedItemId, children }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [expandedItems, setExpandedItems] = useState({
    documentos: false,
    solicitudes: false,
  });

  const menuItems = useMemo(() => buildMenuItems(isAdmin), [isAdmin]);

  useEffect(() => {
    setMounted(true);
    setIsAdmin(localStorage.getItem("isAdmin") === "true");
    if (
      selectedItemId === "nuevo-documento" ||
      selectedItemId === "visualizar-documentos"
    ) {
      setExpandedItems((prev) => ({ ...prev, documentos: true }));
    }
    if (
      selectedItemId === "crear-solicitud" ||
      selectedItemId === "ver-solicitudes"
    ) {
      setExpandedItems((prev) => ({ ...prev, solicitudes: true }));
    }
  }, [selectedItemId]);

  const handleItemClick = (item) => {
    if (item.hasSubmenu) {
      // Expandir/colapsar submenú
      setExpandedItems((prev) => ({
        ...prev,
        [item.id]: !prev[item.id],
      }));
    } else if (item.route) {
      // Navegar a la ruta
      if (item.id === selectedItemId) {
        return;
      }
      router.push(item.route);
    }
  };

  const handleSubmenuClick = (submenuItem) => {
    if (submenuItem.id === selectedItemId) {
      return;
    }
    router.push(submenuItem.route);
  };

  const handleLogout = () => {
    clearAuthClientStorage();
    router.push("/");
  };

  const isItemSelected = (itemId) => {
    return selectedItemId === itemId;
  };

  const isSubmenuItemSelected = (submenuItems) => {
    return submenuItems.some((subItem) => subItem.id === selectedItemId);
  };

  if (!mounted) {
    return null;
  }

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {/* Navbar */}
      <AppBar
        position="fixed"
        sx={{
          width: `calc(100% - ${drawerWidth}px)`,
          ml: `${drawerWidth}px`,
          backgroundColor: "#ffffff",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid rgba(65, 105, 225, 0.14)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
        }}
      >
        <Toolbar>
          <Typography
            variant="h5"
            component="div"
            sx={{
              flexGrow: 1,
              fontWeight: 700,
              color: "#1e3a8a",
              textShadow: "0 0 20px rgba(65, 105, 225, 0.28)",
            }}
          >
            System V-Docs
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            backgroundColor: "#e0e7ff",
            borderRight: "1px solid rgba(65, 105, 225, 0.14)",
            background:
              "linear-gradient(180deg, #e8ecff 0%, #c7d2fe 100%)",
            display: "flex",
            flexDirection: "column",
            height: "100%",
          },
        }}
        variant="permanent"
        anchor="left"
      >
        <Toolbar
          sx={{
            backgroundColor: "#ffffff",
            borderBottom: "1px solid rgba(65, 105, 225, 0.14)",
            minHeight: "64px !important",
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              color: "#1e3a8a",
              fontSize: "1.25rem",
            }}
          >
            Menú
          </Typography>
        </Toolbar>
        <Divider sx={{ borderColor: "rgba(65, 105, 225, 0.14)" }} />
        <List sx={{ pt: 2, flex: 1, overflow: "auto" }}>
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            const isExpanded = expandedItems[item.id] || false;
            const isSelected = item.hasSubmenu
              ? isSubmenuItemSelected(item.submenu)
              : isItemSelected(item.id);

            return (
              <Box key={item.id}>
                <ListItem disablePadding sx={{ mb: 1, px: 1.5 }}>
                  <ListItemButton
                    onClick={() => handleItemClick(item)}
                    sx={{
                      borderRadius: 2,
                      backgroundColor: isSelected
                        ? "rgba(65, 105, 225, 0.1)"
                        : "transparent",
                      border: isSelected
                        ? "2px solid #4169E1"
                        : "2px solid transparent",
                      "&:hover": {
                        backgroundColor: isSelected
                          ? "rgba(65, 105, 225, 0.15)"
                          : "rgba(65, 105, 225, 0.09)",
                        borderColor: "#4169E1",
                      },
                      transition: "all 0.3s ease",
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 40,
                        color: isSelected ? "#4169E1" : "rgba(30, 58, 138, 0.75)",
                      }}
                    >
                      <IconComponent />
                    </ListItemIcon>
                    <ListItemText
                      primary={item.title}
                      secondary={item.description}
                      primaryTypographyProps={{
                        sx: {
                          fontWeight: isSelected ? 600 : 500,
                          color: isSelected ? "#1e3a8a" : "#1e3a8a",
                          fontSize: "0.95rem",
                        },
                      }}
                      secondaryTypographyProps={{
                        sx: {
                          fontSize: "0.75rem",
                          color: isSelected ? "#475569" : "rgba(30, 58, 138, 0.75)",
                          mt: 0.5,
                        },
                      }}
                    />
                    {item.hasSubmenu &&
                      (isExpanded ? (
                        <ExpandLess sx={{ color: "#1e3a8a" }} />
                      ) : (
                        <ExpandMore sx={{ color: "rgba(30, 58, 138, 0.75)" }} />
                      ))}
                  </ListItemButton>
                </ListItem>

                {/* Submenú */}
                {item.hasSubmenu && (
                  <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                      {item.submenu.map((subItem) => {
                        const SubIconComponent = subItem.icon;
                        const isSubSelected = isItemSelected(subItem.id);
                        return (
                          <ListItem
                            key={subItem.id}
                            disablePadding
                            sx={{ mb: 0.5, pl: 4, pr: 1.5 }}
                          >
                            <ListItemButton
                              onClick={() => handleSubmenuClick(subItem)}
                              sx={{
                                borderRadius: 2,
                                backgroundColor: isSubSelected
                                  ? "rgba(65, 105, 225, 0.14)"
                                  : "transparent",
                                border: isSubSelected
                                  ? "2px solid #4169E1"
                                  : "2px solid transparent",
                                "&:hover": {
                                  backgroundColor: isSubSelected
                                    ? "rgba(65, 105, 225, 0.16)"
                                    : "rgba(65, 105, 225, 0.09)",
                                  borderColor: "#4169E1",
                                },
                                transition: "all 0.3s ease",
                              }}
                            >
                              <ListItemIcon
                                sx={{
                                  minWidth: 32,
                                  color: isSubSelected ? "#4169E1" : "rgba(30, 58, 138, 0.75)",
                                }}
                              >
                                <SubIconComponent sx={{ fontSize: 20 }} />
                              </ListItemIcon>
                              <ListItemText
                                primary={subItem.title}
                                primaryTypographyProps={{
                                  sx: {
                                    fontWeight: isSubSelected ? 600 : 500,
                                    color: isSubSelected
                                      ? "#1e3a8a"
                                      : "#1e3a8a",
                                    fontSize: "0.875rem",
                                  },
                                }}
                              />
                            </ListItemButton>
                          </ListItem>
                        );
                      })}
                    </List>
                  </Collapse>
                )}
              </Box>
            );
          })}
        </List>
        <Divider sx={{ borderColor: "rgba(65, 105, 225, 0.14)" }} />
        <List sx={{ py: 1.5, px: 1.5, flexShrink: 0 }}>
          <ListItem disablePadding>
            <ListItemButton
              onClick={handleLogout}
              sx={{
                borderRadius: 2,
                border: "2px solid rgba(65, 105, 225, 0.28)",
                backgroundColor: "rgba(65, 105, 225, 0.08)",
                "&:hover": {
                  backgroundColor: "rgba(65, 105, 225, 0.14)",
                  borderColor: "rgba(255,255,255,0.42)",
                },
                transition: "all 0.3s ease",
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: "#1e3a8a" }}>
                <Logout />
              </ListItemIcon>
              <ListItemText
                primary="Cerrar sesión"
                primaryTypographyProps={{
                  sx: {
                    fontWeight: 600,
                    color: "#1e3a8a",
                    fontSize: "0.95rem",
                  },
                }}
              />
            </ListItemButton>
          </ListItem>
        </List>
      </Drawer>

      {/* Contenido principal */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: `calc(100% - ${drawerWidth}px)`,
          minHeight: "100vh",
          backgroundColor:
            "radial-gradient(circle at top left, #ffffff 0%, #f4f6ff 38%, #e8ecff 72%, #ffffff 100%)",
          position: "relative",
          overflow: "hidden",
          "&::before": {
            content: '""',
            position: "absolute",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            background: "rgba(65, 105, 225, 0.06)",
            top: "-200px",
            right: "-200px",
            pointerEvents: "none",
          },
          "&::after": {
            content: '""',
            position: "absolute",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background: "rgba(65, 105, 225, 0.05)",
            bottom: "-150px",
            left: "-150px",
            pointerEvents: "none",
          },
        }}
      >
        <Toolbar />
        <Box sx={{ position: "relative", zIndex: 1 }}>{children}</Box>
      </Box>
    </Box>
  );
}

export default HexagonMenu;
