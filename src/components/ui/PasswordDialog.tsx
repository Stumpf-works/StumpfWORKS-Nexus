import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Eye, EyeOff, Lock, Key } from "lucide-react";

interface PasswordDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (password: string, remember: boolean) => void;
  authType: "password" | "private_key" | "agent";
  hostname: string;
  username: string;
}

export default function PasswordDialog({
  isOpen,
  onClose,
  onSubmit,
  authType,
  hostname,
  username,
}: PasswordDialogProps) {
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      onSubmit(password, remember);
      setPassword("");
      setRemember(true);
    }
  };

  const handleClose = () => {
    setPassword("");
    setRemember(true);
    onClose();
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-gray-800 rounded-macos-lg shadow-macos overflow-hidden animate-scale-in z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border dark:border-border-dark">
            <Dialog.Title className="text-lg font-semibold text-text-primary dark:text-text-primary-dark flex items-center gap-2">
              {authType === "password" ? (
                <>
                  <Lock className="w-5 h-5" />
                  Enter Password
                </>
              ) : (
                <>
                  <Key className="w-5 h-5" />
                  Enter Passphrase
                </>
              )}
            </Dialog.Title>
            <Dialog.Close className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </Dialog.Close>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <div className="p-3 bg-gray-100 dark:bg-gray-900 rounded-lg">
              <div className="text-sm text-text-secondary mb-1">Connecting to:</div>
              <div className="font-medium text-text-primary dark:text-text-primary-dark font-mono">
                {username}@{hostname}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-text-primary-dark mb-2">
                {authType === "password" ? "Password" : "Private Key Passphrase"}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pr-10"
                  placeholder={authType === "password" ? "Enter your password" : "Enter passphrase"}
                  autoFocus
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-secondary hover:text-text-primary"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="remember"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-accent focus:ring-accent"
              />
              <label htmlFor="remember" className="text-sm text-text-primary dark:text-text-primary-dark cursor-pointer">
                {authType === "password"
                  ? "Remember password (stored encrypted)"
                  : "Remember passphrase (stored encrypted)"}
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
              >
                Connect
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
