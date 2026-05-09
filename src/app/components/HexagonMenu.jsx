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
  Settings,
  ExpandLess,
  ExpandMore,
  Add,
  Visibility,
  Create,
  List as ListIcon,
  Person,
  Logout,
} from "@mui/icons-material";
import { useRouter } from "next/navigation";

const drawerWidth = 240;

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
          id: "mis_solicitudes",
          title: "Mis solicitudes",
          icon: Person,
          route: "/dashboard/mis_solicitudes",
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
      selectedItemId === "mis_solicitudes" ||
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
          backgroundColor: "#1976D2",
          minHeight: { xs: 56, sm: 60 },
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.12)",
        }}
      >
        <Toolbar
          sx={{
            minHeight: { xs: 56, sm: 60 },
            px: { xs: 2, sm: 3 },
          }}
        >
          <Typography
            variant="h6"
            component="div"
            sx={{
              flexGrow: 1,
              fontWeight: 700,
              color: "#ffffff",
              fontSize: { xs: "1.05rem", sm: "1.2rem" },
              letterSpacing: "0.02em",
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
            backgroundColor: "#FFFFFF",
            borderRight: "1px solid rgba(0, 0, 0, 0.08)",
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
            backgroundColor: "#FFFFFF",
            borderBottom: "1px solid rgba(0, 0, 0, 0.08)",
            minHeight: { xs: 56, sm: 60 },
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              color: "#1976D2",
              fontSize: "1.15rem",
            }}
          >
            Menú
          </Typography>
        </Toolbar>
        <Divider sx={{ borderColor: "rgba(0, 0, 0, 0.08)" }} />
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
                      py: 1.125,
                      backgroundColor: isSelected ? "#1976D2" : "transparent",
                      border: "none",
                      "&:hover": {
                        backgroundColor: isSelected
                          ? "#1565C0"
                          : "rgba(25, 118, 210, 0.06)",
                      },
                      transition: "background-color 0.2s ease",
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 40,
                        color: isSelected ? "#ffffff" : "#616161",
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
                          color: isSelected ? "#ffffff" : "#212121",
                          fontSize: "0.95rem",
                        },
                      }}
                      secondaryTypographyProps={{
                        sx: {
                          fontSize: "0.75rem",
                          color: isSelected
                            ? "rgba(255,255,255,0.88)"
                            : "#757575",
                          mt: 0.5,
                        },
                      }}
                    />
                    {item.hasSubmenu &&
                      (isExpanded ? (
                        <ExpandLess
                          sx={{
                            color: isSelected ? "#ffffff" : "#616161",
                          }}
                        />
                      ) : (
                        <ExpandMore
                          sx={{
                            color: isSelected ? "#ffffff" : "#616161",
                          }}
                        />
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
                                py: 0.875,
                                backgroundColor: isSubSelected
                                  ? "#1976D2"
                                  : "transparent",
                                border: "none",
                                "&:hover": {
                                  backgroundColor: isSubSelected
                                    ? "#1565C0"
                                    : "rgba(25, 118, 210, 0.06)",
                                },
                                transition: "background-color 0.2s ease",
                              }}
                            >
                              <ListItemIcon
                                sx={{
                                  minWidth: 32,
                                  color: isSubSelected ? "#ffffff" : "#616161",
                                }}
                              >
                                <SubIconComponent sx={{ fontSize: 20 }} />
                              </ListItemIcon>
                              <ListItemText
                                primary={subItem.title}
                                primaryTypographyProps={{
                                  sx: {
                                    fontWeight: isSubSelected ? 600 : 500,
                                    color: isSubSelected ? "#ffffff" : "#212121",
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
        <Divider sx={{ borderColor: "rgba(0, 0, 0, 0.08)" }} />
        <List sx={{ py: 1.5, px: 1.5, flexShrink: 0 }}>
          <ListItem disablePadding>
            <ListItemButton
              onClick={handleLogout}
              sx={{
                borderRadius: 2,
                border: "1px solid rgba(0, 0, 0, 0.12)",
                backgroundColor: "#FAFAFA",
                "&:hover": {
                  backgroundColor: "rgba(25, 118, 210, 0.06)",
                  borderColor: "rgba(25, 118, 210, 0.25)",
                },
                transition: "all 0.2s ease",
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: "#616161" }}>
                <Logout />
              </ListItemIcon>
              <ListItemText
                primary="Cerrar sesión"
                primaryTypographyProps={{
                  sx: {
                    fontWeight: 600,
                    color: "#212121",
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
          p: { xs: 2, sm: 3 },
          width: `calc(100% - ${drawerWidth}px)`,
          minHeight: "100vh",
          backgroundColor: "#F8F9FA",
          position: "relative",
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 56, sm: 60 } }} />
        <Box sx={{ position: "relative", zIndex: 1 }}>{children}</Box>
      </Box>
    </Box>
  );
}

export default HexagonMenu;
