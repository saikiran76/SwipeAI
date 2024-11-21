export const parseTaxInfo = (taxString: string): { amount: number; percentage: number } => {
  try {
    const amount = parseFloat(taxString.split('(')[0].replace(/,/g, '').trim());
    const percentage = parseFloat(taxString.match(/\((\d+)%\)/)?.[1] || '0');
    return { amount, percentage };
  } catch (error) {
    console.error('Error parsing tax info:', error);
    return { amount: 0, percentage: 0 };
  }
}; 