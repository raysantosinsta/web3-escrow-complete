// app/types/global.d.ts ou no seu arquivo de tipos existente
export { };

declare global {
  interface Window {
    ethereum?: any;
  }
}