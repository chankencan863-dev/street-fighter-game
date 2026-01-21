// Hook dummy untuk scores (bisa diganti dengan implementasi sesungguhnya)
export function useSubmitScore() {
  return {
    mutate: async (data: { playerName: string; score: number }) => {
      console.log('Submitting score:', data);
      // Di sini biasanya ada API call
      return { success: true };
    }
  };
}
