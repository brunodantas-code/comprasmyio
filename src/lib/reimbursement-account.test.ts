import { describe, expect, it } from 'vitest';
import { emptyReimbursementAccount, reimbursementAccountSchema, reimbursementAccountOptions, filterReimbursementAccounts } from './reimbursement-account';
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

describe('Busca tolerante de contas para reembolso', () => {
  const accounts = [
    { id: 'pix-pj', name: 'Conta da empresa', details: { ...emptyReimbursementAccount, name: 'Conta da empresa', holder: 'Empresa teste', person_type: 'PJ', pix_type: 'cnpj', document: '12.345.678/0001-90', pix_key: '12.345.678/0001-90' } },
    { id: 'pix-pf', name: 'Conta pessoal', details: { ...emptyReimbursementAccount, name: 'Conta pessoal', holder: 'José Ávila', document: '12345678901', pix_key: 'jose.teste@example.invalid', pix_type: 'email' } },
    { id: 'bank', name: 'Reembolso bancário', details: { ...emptyReimbursementAccount, name: 'Reembolso bancário', holder: 'Maria teste', method: 'bank', bank: 'Banco Exemplo', agency: '0012', account: '64281-9', account_type: 'poupanca' } },
    { id: 'phone', name: 'Conta telefone', details: { ...emptyReimbursementAccount, name: 'Conta telefone', holder: 'Pessoa telefone', pix_type: 'telefone', pix_key: '+55 (11) 99876-5432' } },
    { id: 'random', name: 'PIX aleatório', details: { ...emptyReimbursementAccount, name: 'PIX aleatório', holder: 'Pessoa teste', pix_type: 'aleatoria', pix_key: '6d75e2ae-23f0-41bc-a099-fb3a00000001' } },
  ];
  const options = reimbursementAccountOptions(accounts);
  const search = (query: string) => filterReimbursementAccounts(options, query).map(option => option.value);
  it('busca CNPJ cadastrado com pontuação digitando apenas os números', () => {
    expect(search('12345678000190')).toEqual(['pix-pj']);
  });
  it('busca CPF sem pontuação quando digitado com máscara', () => {
    expect(search('123.456.789-01')).toEqual(['pix-pf']);
  });
  it('busca titular sem acentos e sem distinguir maiúsculas', () => {
    expect(search('JOSE AVILA')).toEqual(['pix-pf']);
  });
  it('busca chave PIX de e-mail', () => {
    expect(search('JOSE.TESTE@EXAMPLE.INVALID')).toEqual(['pix-pf']);
  });
  it('busca chave PIX de telefone ignorando formatação', () => {
    expect(search('5511998765432')).toEqual(['phone']);
  });
  it('busca chave PIX aleatória ignorando separadores', () => {
    expect(search('6d75e2ae23f041bca099fb3a00000001')).toEqual(['random']);
  });
  it('busca banco', () => {
    expect(search('Banco Exemplo')).toEqual(['bank']);
  });
  it('busca agência', () => {
    expect(search('0012')).toEqual(['bank']);
  });
  it('busca conta com dígito ignorando traço', () => {
    expect(search('642819')).toEqual(['bank']);
  });
  it('busca tipo de pagamento e conta', () => {
    expect(search('Dados bancarios poupanca')).toEqual(['bank']);
  });
  it('combina informações e aceita fragmentos em outra ordem', () => {
    expect(search('avila conta Jose')).toEqual(['pix-pf']);
  });
  it('não transforma texto sem resultado em outra conta ou chave nova', () => {
    expect(search('99999999999999')).toEqual([]);
    expect(filterReimbursementAccounts(options, '')).toBe(options);
    expect(accounts[0].details.pix_key).toBe('12.345.678/0001-90');
  });
});