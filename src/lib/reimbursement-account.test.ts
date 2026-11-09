import { describe, expect, it } from 'vitest';
import { emptyReimbursementAccount, reimbursementAccountSchema } from './reimbursement-account';
describe('Reimbursement destinations', () => {
  it('accepts a PF PIX account', () => {
    expect(reimbursementAccountSchema.safeParse({ ...emptyReimbursementAccount, name: 'Conta PF', holder: 'Pessoa teste', pix_key: 'teste@example.invalid' }).success).toBe(true);
  });
  it('accepts a PJ bank account independently of PIX', () => {
    expect(reimbursementAccountSchema.safeParse({ ...emptyReimbursementAccount, name: 'Conta PJ', holder: 'Empresa teste', person_type: 'PJ', method: 'bank', bank: 'Banco teste', agency: '0001', account: '123-4' }).success).toBe(true);
  });
  it('rejects PIX without a key', () => {
    expect(reimbursementAccountSchema.safeParse({ ...emptyReimbursementAccount, name: 'Conta PF', holder: 'Pessoa teste' }).success).toBe(false);
  });
  it('rejects bank transfers without the destination account', () => {
    expect(reimbursementAccountSchema.safeParse({ ...emptyReimbursementAccount, name: 'Conta PJ', holder: 'Empresa teste', method: 'bank', bank: 'Banco teste', agency: '0001' }).success).toBe(false);
  });
});