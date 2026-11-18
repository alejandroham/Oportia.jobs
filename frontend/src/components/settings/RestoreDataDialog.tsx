import React from 'react';
import { create } from 'zustand';
import { Dialog } from '../ui/Dialog';
import { OpiAvatar } from '../ui/OpiAvatar';
import { RestoreBackup } from './RestoreBackup';

interface RestoreDialogStore {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

/** Abre "Recuperar mis datos" desde cualquier parte (portada, guía de inicio, secciones bloqueadas). */
export const useRestoreDialog = create<RestoreDialogStore>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false })
}));

/**
 * "¿Ya usabas Oportia en otro equipo?": Oportia no tiene cuentas ni guarda tu CV en un servidor, así que
 * para cambiar de equipo se usa el archivo de respaldo que descargaste en el otro equipo.
 */
export const RestoreDataDialog: React.FC<{ onRestored: () => void }> = ({ onRestored }) => {
  const { isOpen, close } = useRestoreDialog();
  return (
    <Dialog isOpen={isOpen} onClose={close} title="Recuperar mis datos" maxWidth="md">
      <div className="space-y-4 text-sm">
        <div className="flex items-start gap-3">
          <OpiAvatar expression="saludando" size={64} decorative className="shrink-0" />
          <p className="text-ink dark:text-gray-200 leading-relaxed">
            Oportia no tiene cuentas: tus datos viven solo en el navegador donde los creaste. Para usarlos en este equipo,
            abre el <strong>archivo de respaldo</strong> que descargaste.
          </p>
        </div>
        <ol className="list-decimal pl-5 space-y-1 text-xs text-ink-muted dark:text-ink-200">
          <li>
            En tu otro equipo, entra a <strong>Ajustes → Privacidad</strong> y pulsa <strong>Descargar archivo (.oportia)</strong>.
          </li>
          <li>Pasa ese archivo a este equipo (por correo, nube o pendrive).</li>
          <li>Aquí, pulsa <strong>Elegir mi archivo de respaldo</strong>. Si le pusiste contraseña, te la pediremos.</li>
        </ol>
        <RestoreBackup
          buttonLabel="Elegir mi archivo de respaldo"
          onRestored={() => {
            close();
            onRestored();
          }}
        />
        <p className="text-xs text-ink-muted dark:text-ink-200">
          El archivo se abre en este navegador y no se sube a ningún servidor. ¿No tienes respaldo? Puedes empezar de nuevo
          subiendo tu CV.
        </p>
      </div>
    </Dialog>
  );
};
