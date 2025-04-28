import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react'; // Use @testing-library/react instead
import { usePLCCode, PLCCodeEntry } from '@/hooks/usePLCCode';
import { supabase } from '@/integrations/supabase/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn(), // Mock single if used by the hook directly
    // Add other Supabase methods used by the hook if necessary
  }
}));

// Mock the auth store to provide a dummy user
vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({ user: { id: 'test-user-id' } }))
}));

// Helper to create a QueryClient wrapper for hooks
// Helper to create a QueryClient wrapper for hooks
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // ✅ turns retries off
        retry: false,
      },
    },
  });

  // Return the component function directly
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};


describe('Integration: File Management (usePLCCode Hook)', () => {

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    // Reset mocked implementations if needed, e.g., mockResolvedValue
    (supabase.from as any).mockReturnThis(); // Ensure chaining works
    (supabase.eq as any).mockReturnThis();
    (supabase.order as any).mockReturnThis();
  });

  it('should fetch PLC codes', async () => {
    const mockData: PLCCodeEntry[] = [
      { id: '1', title: 'File 1', code: 'CODE1', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '2', title: 'File 2', code: 'CODE2', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ];
    // Assuming vitest types are globally available, remove vi.Mock cast
    (supabase.select as any).mockResolvedValueOnce({ data: mockData, error: null });

    const wrapper = createWrapper();
    const { result, waitFor } = renderHook(() => usePLCCode(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(supabase.from).toHaveBeenCalledWith('plc_code');
    expect(supabase.select).toHaveBeenCalledWith('*');
    expect(supabase.order).toHaveBeenCalledWith('updated_at', { ascending: false });
    expect(result.current.plcCodes).toEqual(mockData);
  });

  // --- Add tests for save, update, delete, duplicate ---

  it('should save a new PLC code', async () => {
    const newCodeData = { title: 'New File', code: 'NEW CODE' };
    const savedEntry: PLCCodeEntry = { ...newCodeData, id: '3', user_id: 'test-user-id', created_at: new Date().toISOString(), updated_at: new Date().toISOString() };

    // Mock the insert operation
    const insertMock = vi.fn().mockResolvedValueOnce({ data: savedEntry, error: null });
    // Assuming vitest types are globally available, remove vi.Mock cast
    (supabase.insert as any).mockReturnValue({ select: vi.fn().mockReturnThis(), single: insertMock });


    const wrapper = createWrapper();
    const { result } = renderHook(() => usePLCCode(), { wrapper });

    await act(async () => {
      await result.current.savePLCCode.mutateAsync(newCodeData);
    });

    expect(supabase.from).toHaveBeenCalledWith('plc_code');
    expect(supabase.insert).toHaveBeenCalledWith([{ ...newCodeData, user_id: 'test-user-id' }]);
    // Check if select().single() was called after insert
    // Assuming vitest types are globally available, remove vi.Mock cast
    expect((supabase.insert as any).mock.results[0].value.select).toHaveBeenCalled();
    expect((supabase.insert as any).mock.results[0].value.single).toHaveBeenCalled();

    // We might also want to check if queryClient.invalidateQueries was called,
    // but that requires mocking QueryClient more deeply or spying on it.
  });

  it('should update an existing PLC code', async () => {
    const updateData = { id: '1', title: 'Updated File 1', code: 'UPDATED CODE1' };
    const updatedEntry: PLCCodeEntry = { ...updateData, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };

     // Mock the update operation
    const updateMock = vi.fn().mockResolvedValueOnce({ data: updatedEntry, error: null });
     // Assuming vitest types are globally available, remove vi.Mock cast
    (supabase.update as any).mockReturnValue({ eq: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), single: updateMock });


    const wrapper = createWrapper();
    const { result } = renderHook(() => usePLCCode(), { wrapper });

    await act(async () => {
      await result.current.updatePLCCode.mutateAsync(updateData);
    });

    expect(supabase.from).toHaveBeenCalledWith('plc_code');
    expect(supabase.update).toHaveBeenCalledWith({ code: updateData.code, title: updateData.title });
    // Assuming vitest types are globally available, remove vi.Mock cast
    expect((supabase.update as any).mock.results[0].value.eq).toHaveBeenCalledWith('id', updateData.id);
    expect((supabase.update as any).mock.results[0].value.select).toHaveBeenCalled();
    expect((supabase.update as any).mock.results[0].value.single).toHaveBeenCalled();
  });

  it('should delete a PLC code', async () => {
    const fileIdToDelete = '1';

    // Mock the delete operation
    // Assuming vitest types are globally available, remove vi.Mock cast
    (supabase.delete as any).mockResolvedValueOnce({ error: null });

    const wrapper = createWrapper();
    const { result } = renderHook(() => usePLCCode(), { wrapper });

    await act(async () => {
      await result.current.deletePLCCode.mutateAsync(fileIdToDelete);
    });

    expect(supabase.from).toHaveBeenCalledWith('plc_code');
    expect(supabase.delete).toHaveBeenCalled();
    expect(supabase.eq).toHaveBeenCalledWith('id', fileIdToDelete);
  });


  it('should duplicate a PLC code', async () => {
      const originalFileId = '1';
      const newTitle = 'File 1 (Copy)';
      const originalCode = { code: 'ORIGINAL CODE' };
      const duplicatedEntry: PLCCodeEntry = { id: '4', title: newTitle, code: originalCode.code, user_id: 'test-user-id', created_at: new Date().toISOString(), updated_at: new Date().toISOString() };

      // Mock the select operation to fetch the original code
      const selectMock = vi.fn().mockResolvedValueOnce({ data: originalCode, error: null });
      // Assuming vitest types are globally available, remove vi.Mock cast
      (supabase.select as any).mockReturnValue({ eq: vi.fn().mockReturnThis(), single: selectMock });

      // Mock the insert operation for the duplicated entry
      const insertMock = vi.fn().mockResolvedValueOnce({ data: duplicatedEntry, error: null });
      // Assuming vitest types are globally available, remove vi.Mock cast
      (supabase.insert as any).mockReturnValue({ select: vi.fn().mockReturnThis(), single: insertMock });

      const wrapper = createWrapper();
      const { result } = renderHook(() => usePLCCode(), { wrapper });

      await act(async () => {
        await result.current.duplicatePLCCode.mutateAsync({ id: originalFileId, title: newTitle });
      });

      // Check the select call
      expect(supabase.from).toHaveBeenCalledWith('plc_code');
      expect(supabase.select).toHaveBeenCalledWith('code');
      // Assuming vitest types are globally available, remove vi.Mock cast
      expect((supabase.select as any).mock.results[0].value.eq).toHaveBeenCalledWith('id', originalFileId);
      expect((supabase.select as any).mock.results[0].value.single).toHaveBeenCalled();

      // Check the insert call
      expect(supabase.from).toHaveBeenCalledWith('plc_code'); // Called again for insert
      expect(supabase.insert).toHaveBeenCalledWith([{ code: originalCode.code, title: newTitle, user_id: 'test-user-id' }]);
      // Assuming vitest types are globally available, remove vi.Mock cast
      expect((supabase.insert as any).mock.results[0].value.select).toHaveBeenCalled();
      expect((supabase.insert as any).mock.results[0].value.single).toHaveBeenCalled();
  });

});