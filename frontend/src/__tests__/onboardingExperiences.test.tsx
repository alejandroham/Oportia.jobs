import React, { useState } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OnboardingStep1CV } from '../components/onboarding/OnboardingStep1CV';
import type { WorkExperience } from '../types';

/** 1.6.8 (DT-19): la guía muestra las experiencias detectadas y permite corregir cargo y empresa. */
const exp = (role: string, company: string): WorkExperience => ({
  id: role, role, company, start_date: '03/2023', end_date: 'Actualidad', is_remote: false, description: '', technologies: [], bullet_achievements: []
});

function Harness() {
  const [list, setList] = useState<WorkExperience[]>([exp('Hospital Ficticio del Puerto', 'TENS Servicio de Urgencia')]);
  return (
    <>
      <OnboardingStep1CV
        isUploading={false} onFileUpload={() => {}} tempName="Paula" setTempName={() => {}} tempTitle="TENS" setTempTitle={() => {}}
        tempSkills={[]} setTempSkills={() => {}} experiences={list} setExperiences={setList}
      />
      <output data-testid="state">{list.map((e) => `${e.role}@${e.company}`).join('|')}</output>
    </>
  );
}

describe('Confirmar experiencias en la guía', () => {
  it('intercambia cargo y empresa con un botón', () => {
    render(<Harness />);
    expect(screen.getByLabelText('Cargo')).toHaveValue('Hospital Ficticio del Puerto');
    fireEvent.click(screen.getByRole('button', { name: /Intercambiar cargo y empresa/ }));
    expect(screen.getByTestId('state').textContent).toBe('TENS Servicio de Urgencia@Hospital Ficticio del Puerto');
  });

  it('permite editar el cargo', () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText('Empresa'), { target: { value: 'Hospital del Puerto' } });
    expect(screen.getByTestId('state').textContent).toContain('@Hospital del Puerto');
  });
});
