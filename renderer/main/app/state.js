export const state = {
  userId: localStorage.getItem("userId"),
  role: (localStorage.getItem("role") || "cliente").toLowerCase(),
  username: localStorage.getItem("username") || "Usuario",
  email: localStorage.getItem("email") || "email@example.com",
  imagen: localStorage.getItem("imagen") || "",
};

export const globals = {
  // empresas
  empresasGlobal: [],
  empresaIndex: null,
  empresaActual: null,

  // trabajadores
  trabajadoresGlobal: [],
  trabajadorIndex: null,
  trabajadorActual: null,
  empresasGlobalList: [],
};
