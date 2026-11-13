import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Dialog } from '../components/ui/Dialog';
import { AINotConnectedBanner } from '../features/shared/AINotConnectedBanner';
import { FitScoreBadge } from '../features/shared/FitScoreBadge';
import { FailedSourcesBanner } from '../features/empleos/FailedSourcesBanner';

describe('Sistema de Componentes UI Base', () => {
  describe('Button', () => {
    it('renderiza texto y maneja clics correctamente', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Subir CV</Button>);

      const btn = screen.getByRole('button', { name: /subir cv/i });
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('respeta el estado de deshabilitado', () => {
      const handleClick = vi.fn();
      render(<Button disabled onClick={handleClick}>Acción</Button>);

      const btn = screen.getByRole('button', { name: /acción/i });
      expect(btn).toBeDisabled();
      fireEvent.click(btn);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('muestra el estado de carga y deshabilita interacción', () => {
      render(<Button isLoading>Guardando</Button>);
      const btn = screen.getByRole('button');
      expect(btn).toBeDisabled();
    });
  });

  describe('Badge', () => {
    it('renderiza con la variante y texto apropiados', () => {
      const { container } = render(<Badge variant="brand">Remoto</Badge>);
      expect(screen.getByText('Remoto')).toBeInTheDocument();
      expect(container.firstChild).toHaveClass('text-brand-700');
    });

    it('renderiza variantes semánticas de éxito y advertencia', () => {
      const { container, rerender } = render(<Badge variant="success">Cumplido</Badge>);
      expect(container.firstChild).toHaveClass('text-emerald-700');

      rerender(<Badge variant="warning">Por verificar</Badge>);
      expect(container.firstChild).toHaveClass('text-amber-800');
    });
  });

  describe('Card', () => {
    it('renderiza estructura y contenido con estilos interactivos', () => {
      const { container } = render(
        <Card interactive padding="lg">
          <h3>Título de Tarjeta</h3>
          <p>Contenido central</p>
        </Card>
      );

      expect(screen.getByText('Título de Tarjeta')).toBeInTheDocument();
      expect(screen.getByText('Contenido central')).toBeInTheDocument();
      expect(container.firstChild).toHaveClass('cursor-pointer');
      expect(container.firstChild).toHaveClass('p-6');
    });
  });

  describe('Dialog', () => {
    it('no renderiza nada cuando isOpen es falso', () => {
      render(
        <Dialog isOpen={false} onClose={() => {}}>
          <p>Modal oculto</p>
        </Dialog>
      );
      expect(screen.queryByText('Modal oculto')).not.toBeInTheDocument();
    });

    it('renderiza el modal accesible y cierra al presionar Escape', () => {
      const handleClose = vi.fn();
      render(
        <Dialog isOpen={true} onClose={handleClose} title="Título Modal">
          <p>Contenido del modal</p>
        </Dialog>
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Título Modal')).toBeInTheDocument();
      expect(screen.getByText('Contenido del modal')).toBeInTheDocument();

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('AINotConnectedBanner', () => {
    it('renderiza el mensaje de orientación y el botón para conectar IA', () => {
      const handleConnect = vi.fn();
      render(
        <AINotConnectedBanner
          title="Conecta la IA para obtener esta evaluación"
          onConnect={handleConnect}
        />
      );

      expect(screen.getByText('Conecta la IA para obtener esta evaluación')).toBeInTheDocument();
      const btn = screen.getByRole('button', { name: /conectar ia/i });
      fireEvent.click(btn);
      expect(handleConnect).toHaveBeenCalledTimes(1);
    });

    it('renderiza versión compacta cuando compact=true', () => {
      render(
        <AINotConnectedBanner
          compact
          title="IA desconectada"
          actionText="Activar"
        />
      );
      expect(screen.getByText('IA desconectada')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /activar/i })).toBeInTheDocument();
    });
  });

  describe('FitScoreBadge', () => {
    it('renderiza puntaje y etiqueta porcentual', () => {
      render(<FitScoreBadge score={88} />);
      expect(screen.getByText(/88%/)).toBeInTheDocument();
      expect(screen.getByText(/Alta/)).toBeInTheDocument();
    });

    it('renderiza "Estimación básica (sin IA)" cuando calculationType="basic"', () => {
      render(<FitScoreBadge score={70} calculationType="basic" />);
      expect(screen.getByText(/70%/)).toBeInTheDocument();
      expect(screen.getByText(/estimación básica \(sin ia\)/i)).toBeInTheDocument();
    });
  });

  describe('FailedSourcesBanner', () => {
    it('no renderiza nada cuando sourcesFailed está vacío', () => {
      const { container } = render(
        <FailedSourcesBanner
          sourcesFailed={[]}
          isScanning={false}
          onRetry={vi.fn()}
          onDismiss={vi.fn()}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it('renderiza fuentes fallidas y dispara eventos de reintentar y descartar', () => {
      const handleRetry = vi.fn();
      const handleDismiss = vi.fn();

      render(
        <FailedSourcesBanner
          sourcesFailed={['LinkedIn Empleos', 'RemoteOK']}
          isScanning={false}
          onRetry={handleRetry}
          onDismiss={handleDismiss}
        />
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/2 fuentes no respondieron/i)).toBeInTheDocument();
      expect(screen.getByText(/LinkedIn Empleos, RemoteOK/i)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /reintentar/i }));
      expect(handleRetry).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByRole('button', { name: /descartar/i }));
      expect(handleDismiss).toHaveBeenCalledTimes(1);
    });
  });
});
