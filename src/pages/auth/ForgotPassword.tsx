import { Button } from '@/components';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import MiContainerLogo from '@/assets/img/MiContainerLogo.png';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import { forgotPasswordService } from '@/services/auth.services';
import { showApiError, showSuccess } from '@/utils/alerts';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      showApiError(new Error('Por favor ingresa tu correo electrónico'));
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await forgotPasswordService(email);
      setEmailSent(true);
      showSuccess(response.message || 'Si el correo existe, recibirás un enlace para restablecer tu contraseña.');
    } catch (error) {
      showApiError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-24 w-auto flex items-center justify-center">
              <img 
                src={MiContainerLogo} 
                alt="MiContainer Logo" 
                className="h-24 w-auto"
              />
            </div>
            <div className="mt-8 flex justify-center">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Correo Enviado
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Si el correo existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña.
            </p>
            <p className="mt-4 text-sm text-gray-600">
              Revisa tu bandeja de entrada y sigue las instrucciones.
            </p>
            <p className="mt-2 text-xs text-gray-500">
              El enlace expirará en 1 hora.
            </p>
          </div>

          <div className="mt-6">
            <Link to="/login">
              <Button variant="outline" className="w-full flex items-center justify-center">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al inicio de sesión
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-24 w-auto flex items-center justify-center">
            <img 
              src={MiContainerLogo} 
              alt="MiContainer Logo" 
              className="h-24 w-auto"
            />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Recuperar Contraseña
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Correo Electrónico
            </label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                placeholder="tu@email.com"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div>
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Enviando...' : 'Enviar Enlace de Recuperación'}
            </Button>
          </div>

          <div className="text-center">
            <Link 
              to="/login" 
              className="text-sm text-green-600 hover:text-green-500 flex items-center justify-center"
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Volver al inicio de sesión
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
