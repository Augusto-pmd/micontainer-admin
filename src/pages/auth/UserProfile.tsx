import { Button, Modal } from "@/components";
import { useAuth } from "@/stores/authStore";
import { UserRole } from "@/types/auth";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showSuccess } from "@/utils/alerts";
import { updateUserSilent, getUserById } from "@/services/user.services";
import { Spinner } from "@/components/ui/spinner";

const UserProfile = () => {
  const { user, logout } = useAuth();
  const [userData, setUserData] = useState<any>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");

  // Cargar datos del usuario desde el backend
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.id) return;

      try {
        setIsLoadingUser(true);
        const response = await getUserById(user.id);
        setUserData(response);
      } catch (error) {
        console.error("Error al cargar datos del usuario:", error);
      } finally {
        setIsLoadingUser(false);
      }
    };

    fetchUserData();
  }, [user?.id]);

  const getRoleDisplayName = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return "Administrador";
      case UserRole.OPERATOR:
        return "Operador";
      case UserRole.USER:
        return "Usuario";
      case UserRole.GUEST:
        return "Invitado";
      default:
        return role;
    }
  };

  const openEditProfileModal = () => {
    // Pre-cargar los datos actuales del usuario desde userData
    setProfileData({
      firstName: userData?.firstName || "",
      lastName: userData?.lastName || "",
      email: userData?.email || "",
    });
    setIsEditProfileModalOpen(true);
  };

  const handleProfileUpdate = async () => {
    // Limpiar error previo
    setProfileError("");

    // Validaciones
    if (!profileData.firstName.trim()) {
      setProfileError("El nombre es obligatorio");
      return;
    }

    if (!profileData.lastName.trim()) {
      setProfileError("El apellido es obligatorio");
      return;
    }

    if (!profileData.email.trim()) {
      setProfileError("El email es obligatorio");
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(profileData.email)) {
      setProfileError("El formato del email no es válido");
      return;
    }

    try {
      setIsUpdatingProfile(true);

      if (!user?.id) {
        setProfileError("No se pudo identificar el usuario");
        return;
      }

      // Actualizar perfil usando el servicio updateUserSilent (sin alert automático)
      await updateUserSilent(user.id, {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        email: profileData.email,
      });

      showSuccess("Perfil actualizado exitosamente");
      setIsEditProfileModalOpen(false);
      setProfileData({ firstName: "", lastName: "", email: "" });
      setProfileError("");

      // Recargar los datos del usuario
      const response = await getUserById(user.id);
      setUserData(response);
    } catch (error: any) {
      // El error ya se mostró en el interceptor de la API, solo actualizamos el estado
      console.error("Error al actualizar perfil:", error);
      setProfileError(
        error.response?.data?.message || 
        "Error al actualizar el perfil. Intenta nuevamente."
      );
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return "bg-red-100 text-red-800";
      case UserRole.OPERATOR:
        return "bg-yellow-100 text-yellow-800";
      case UserRole.USER:
        return "bg-green-100 text-green-800";
      case UserRole.GUEST:
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handlePasswordChange = async () => {
    // Limpiar error previo
    setPasswordError("");

    // Validaciones
    if (!passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError("Por favor completa todos los campos");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("Las contraseñas no coinciden");
      return;
    }

    try {
      setIsChangingPassword(true);
      
      if (!user?.id) {
        setPasswordError("No se pudo identificar el usuario");
        return;
      }

      // Actualizar contraseña usando el servicio updateUserSilent (sin alert automático)
      await updateUserSilent(user.id, { password: passwordData.newPassword });
      
      showSuccess("Contraseña actualizada exitosamente");
      setIsPasswordModalOpen(false);
      setPasswordData({ newPassword: "", confirmPassword: "" });
      setPasswordError("");
    } catch (error: any) {
      // El error ya se mostró en el interceptor de la API, solo actualizamos el estado
      console.error("Error al cambiar contraseña:", error);
      setPasswordError(
        error.response?.data?.message || 
        "Error al cambiar la contraseña. Intenta nuevamente."
      );
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoadingUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner className="h-12 w-12 text-green-700" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Mi Perfil</h1>
        <p className="text-green-100">
          Gestiona tu información personal y configuración de cuenta.
        </p>
      </div>

      {/* Información del usuario */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">
            Información Personal
          </h3>

          <div className="flex items-center space-x-6 mb-6">
            <div className="flex-shrink-0">
              <div className="h-20 w-20 rounded-full bg-green-700 flex items-center justify-center text-white text-2xl font-bold">
                {userData?.avatar || userData?.firstName?.charAt(0)?.toUpperCase() || "U"}
              </div>
            </div>
            <div>
              <h4 className="text-xl font-semibold text-gray-900">
                {userData?.firstName} {userData?.lastName}
              </h4>
              <p className="text-gray-500">{userData?.email}</p>
              <span
                className={`inline-flex mt-2 px-3 py-1 text-sm font-medium rounded-full ${getRoleBadgeColor(
                  user?.role || UserRole.GUEST
                )}`}
              >
                {getRoleDisplayName(user?.role || UserRole.GUEST)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre
              </label>
              <div className="mt-1 p-3 bg-gray-50 rounded-md text-sm text-gray-900">
                {userData?.firstName || "No disponible"}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Apellido
              </label>
              <div className="mt-1 p-3 bg-gray-50 rounded-md text-sm text-gray-900">
                {userData?.lastName || "No disponible"}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Correo electrónico
              </label>
              <div className="mt-1 p-3 bg-gray-50 rounded-md text-sm text-gray-900">
                {userData?.email || "No disponible"}
              </div>
            </div>

            {/* <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Usuario ID
              </label>
              <div className="mt-1 p-3 bg-gray-50 rounded-md text-sm text-gray-900">
                {user?.id || "No disponible"}
              </div>
            </div> */}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado de la cuenta
              </label>
              <div className="mt-1">
                <span
                  className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                    user?.isActive
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {user?.isActive ? "Activa" : "Inactiva"}
                </span>
              </div>
            </div>

            {/* {user?.createdAt && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de registro
                </label>
                <div className="mt-1 p-3 bg-gray-50 rounded-md text-sm text-gray-900">
                  {new Date(user.createdAt).toLocaleDateString("es-ES", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
              </div>
            )}

            {user?.lastLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Último acceso
                </label>
                <div className="mt-1 p-3 bg-gray-50 rounded-md text-sm text-gray-900">
                  {new Date(user.lastLogin).toLocaleDateString("es-ES", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            )} */}
          </div>
        </div>
      </div>

      {/* Configuración de cuenta */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Configuración de Cuenta
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Seguridad</h4>
              <p className="text-sm text-gray-500 mb-3">
                Cambia tu contraseña y configura la autenticación de dos
                factores.
              </p>
              <Modal
                trigger={
                  <Button variant="primary" size="sm">
                    Cambiar Contraseña
                  </Button>
                }
                title="Cambiar Contraseña"
                description="Ingresa y confirma tu nueva contraseña"
                open={isPasswordModalOpen}
                onOpenChange={setIsPasswordModalOpen}
              >
                <div className="space-y-4">
                  {passwordError && (
                    <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-sm">
                      {passwordError}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Nueva Contraseña</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="Ingresa tu nueva contraseña"
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          newPassword: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">
                      Confirmar Contraseña
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirma tu nueva contraseña"
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          confirmPassword: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setIsPasswordModalOpen(false);
                        setPasswordData({
                          newPassword: "",
                          confirmPassword: "",
                        });
                        setPasswordError("");
                      }}
                      disabled={isChangingPassword}
                    >
                      Cancelar
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handlePasswordChange}
                      disabled={isChangingPassword}
                    >
                      {isChangingPassword ? "Guardando..." : "Guardar"}
                    </Button>
                  </div>
                </div>
              </Modal>
            </div>

            {/* <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Notificaciones</h4>
              <p className="text-sm text-gray-500 mb-3">
                Configura cómo y cuándo quieres recibir notificaciones.
              </p>
              <button className="bg-green-700 text-white px-4 py-2 rounded-md text-sm hover:bg-green-800">
                Configurar
              </button>
            </div> */}

            {/* <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">
                Datos de la cuenta
              </h4>
              <p className="text-sm text-gray-500 mb-3">
                Descarga o elimina tu información personal.
              </p>
              <Button variant="primary" size="sm">
                Gestionar
              </Button>
            </div> */}
          </div>
        </div>
      </div>

      {/* Acciones de cuenta */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Acciones de Cuenta
          </h3>
          <div className="flex flex-wrap gap-4">
            <Modal
              trigger={
                <Button variant="primary" size="sm" onClick={openEditProfileModal}>
                  Editar Perfil
                </Button>
              }
              title="Editar Perfil"
              description="Actualiza tu información personal"
              open={isEditProfileModalOpen}
              onOpenChange={setIsEditProfileModalOpen}
            >
              <div className="space-y-4">
                {profileError && (
                  <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-sm">
                    {profileError}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="firstName">Nombre</Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="Ingresa tu nombre"
                    value={profileData.firstName}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        firstName: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Apellido</Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Ingresa tu apellido"
                    value={profileData.lastName}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        lastName: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Ingresa tu email"
                    value={profileData.email}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        email: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setIsEditProfileModalOpen(false);
                      setProfileData({
                        firstName: "",
                        lastName: "",
                        email: "",
                      });
                      setProfileError("");
                    }}
                    disabled={isUpdatingProfile}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleProfileUpdate}
                    disabled={isUpdatingProfile}
                  >
                    {isUpdatingProfile ? "Guardando..." : "Guardar"}
                  </Button>
                </div>
              </div>
            </Modal>
            <Button onClick={logout} variant="danger" size="sm">
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </div>

      {/* Información adicional si el usuario es admin */}
      {user?.role === UserRole.ADMIN && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Privilegios de Administrador
              </h3>
              <div className="mt-1 text-sm text-yellow-700">
                <p>
                  Tienes acceso completo al sistema. Usa estos privilegios
                  responsablemente.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
