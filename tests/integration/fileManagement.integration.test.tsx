import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react'; // Import waitFor
import React from 'react'; // Import React for JSX
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
    (supabase.select as any).mockClear(); // Clear specific mocks if needed
    (supabase.insert as any).mockClear();
    (supabase.update as any).mockClear();
    (supabase.delete as any).mockClear();
    (supabase.single as any).mockClear();
  });

  it('should fetch PLC codes', async () => {
    const mockData: PLCCodeEntry[] = [
      { id: '1', title: 'File 1', code: 'CODE1', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), user_id: 'test-user-id' }, // Added user_id for consistency
      { id: '2', title: 'File 2', code: 'CODE2', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), user_id: 'test-user-id' }, // Added user_id for consistency
    ];
    (supabase.select as any).mockResolvedValueOnce({ data: mockData, error: null });

    const wrapper = createWrapper();
    const { result } = renderHook(() => usePLCCode(), { wrapper });

    // Use imported waitFor
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(supabase.from).toHaveBeenCalledWith('plc_code');
    expect(supabase.select).toHaveBeenCalledWith('*');
    expect(supabase.order).toHaveBeenCalledWith('updated_at', { ascending: false });
    expect(result.current.plcCodes).toEqual(mockData);
  });

  // --- Add tests for save, update, delete, duplicate ---

  it('should save a new PLC code', async () => {
    const newCodeData = { title: 'New File', code: 'NEW CODE' };
    // Ensure the mock saved entry matches the expected structure, including user_id
    const savedEntry: PLCCodeEntry = { ...newCodeData, id: '3', user_id: 'test-user-id', created_at: new Date().toISOString(), updated_at: new Date().toISOString() };

    // Mock the insert operation's chained calls
    const singleMock = vi.fn().mockResolvedValueOnce({ data: savedEntry, error: null });
    const selectMock = vi.fn().mockReturnValue({ single: singleMock });
    (supabase.insert as any).mockReturnValue({ select: selectMock });


    const wrapper = createWrapper();
    const { result } = renderHook(() => usePLCCode(), { wrapper });

    await act(async () => {
      await result.current.savePLCCode.mutateAsync(newCodeData);
    });

    expect(supabase.from).toHaveBeenCalledWith('plc_code');
    expect(supabase.insert).toHaveBeenCalledWith([{ ...newCodeData, user_id: 'test-user-id' }]);
    // Check if select().single() was called after insert
    expect(selectMock).toHaveBeenCalled();
    expect(singleMock).toHaveBeenCalled();

    // We might also want to check if queryClient.invalidateQueries was called,
    // but that requires mocking QueryClient more deeply or spying on it.
  });

  it('should update an existing PLC code', async () => {
    const updateData = { id: '1', title: 'Updated File 1', code: 'UPDATED CODE1' };
    // Ensure the mock updated entry matches the expected structure
    const updatedEntry: PLCCodeEntry = { ...updateData, user_id: 'test-user-id', created_at: new Date().toISOString(), updated_at: new Date().toISOString() };

     // Mock the update operation's chained calls
    const singleMock = vi.fn().mockResolvedValueOnce({ data: updatedEntry, error: null });
    const selectMock = vi.fn().mockReturnValue({ single: singleMock });
    const eqMock = vi.fn().mockReturnValue({ select: selectMock });
    (supabase.update as any).mockReturnValue({ eq: eqMock });


    const wrapper = createWrapper();
    const { result } = renderHook(() => usePLCCode(), { wrapper });

    await act(async () => {
      await result.current.updatePLCCode.mutateAsync(updateData);
    });

    expect(supabase.from).toHaveBeenCalledWith('plc_code');
    expect(supabase.update).toHaveBeenCalledWith({ code: updateData.code, title: updateData.title });
    expect(eqMock).toHaveBeenCalledWith('id', updateData.id);
    expect(selectMock).toHaveBeenCalled();
    expect(singleMock).toHaveBeenCalled();
  });

  it('should delete a PLC code', async () => {
    const fileIdToDelete = '1';

    // Mock the delete operation's chained calls
    const eqMock = vi.fn().mockResolvedValueOnce({ error: null }); // delete itself doesn't return data, just potential error
    (supabase.delete as any).mockReturnValue({ eq: eqMock });

    const wrapper = createWrapper();
    const { result } = renderHook(() => usePLCCode(), { wrapper });

    await act(async () => {
      await result.current.deletePLCCode.mutateAsync(fileIdToDelete);
    });

    expect(supabase.from).toHaveBeenCalledWith('plc_code');
    expect(supabase.delete).toHaveBeenCalled();
    expect(eqMock).toHaveBeenCalledWith('id', fileIdToDelete);
  });


  it('should duplicate a PLC code', async () => {
      const originalFileId = '1';
      const newTitle = 'File 1 (Copy)';
      const originalCode = { code: 'ORIGINAL CODE' };
      // Ensure the mock duplicated entry matches the expected structure
      const duplicatedEntry: PLCCodeEntry = { id: '4', title: newTitle, code: originalCode.code, user_id: 'test-user-id', created_at: new Date().toISOString(), updated_at: new Date().toISOString() };

      // Mock the select operation to fetch the original code
      const selectSingleMock = vi.fn().mockResolvedValueOnce({ data: originalCode, error: null });
      const selectEqMock = vi.fn().mockReturnValue({ single: selectSingleMock });
      (supabase.select as any).mockReturnValue({ eq: selectEqMock }); // Mock select().eq().single()

      // Mock the insert operation for the duplicated entry
      const insertSingleMock = vi.fn().mockResolvedValueOnce({ data: duplicatedEntry, error: null });
      const insertSelectMock = vi.fn().mockReturnValue({ single: insertSingleMock });
      (supabase.insert as any).mockReturnValue({ select: insertSelectMock }); // Mock insert().select().single()

      const wrapper = createWrapper();
      const { result } = renderHook(() => usePLCCode(), { wrapper });

      await act(async () => {
        await result.current.duplicatePLCCode.mutateAsync({ id: originalFileId, title: newTitle });
      });

      // Check the select call chain
      expect(supabase.from).toHaveBeenCalledWith('plc_code');
      expect(supabase.select).toHaveBeenCalledWith('code');
      expect(selectEqMock).toHaveBeenCalledWith('id', originalFileId);
      expect(selectSingleMock).toHaveBeenCalled();

      // Check the insert call chain
      expect(supabase.from).toHaveBeenCalledWith('plc_code'); // Called again for insert
      expect(supabase.insert).toHaveBeenCalledWith([{ code: originalCode.code, title: newTitle, user_id: 'test-user-id' }]);
      expect(insertSelectMock).toHaveBeenCalled();
      expect(insertSingleMock).toHaveBeenCalled();
  });

});