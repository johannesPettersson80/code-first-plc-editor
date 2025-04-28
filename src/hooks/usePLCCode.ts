
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth';

export interface PLCCodeEntry {
  id: string;
  title: string;
  code: string;
  created_at: string;
  updated_at: string;
}

export const usePLCCode = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const { data: plcCodes, isLoading } = useQuery({
    queryKey: ['plc-codes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plc_code')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data as PLCCodeEntry[];
    },
    enabled: !!user
  });

  const savePLCCode = useMutation({
    mutationFn: async ({ code, title }: { code: string; title: string }) => {
      const { data, error } = await supabase
        .from('plc_code')
        .insert([{ code, title, user_id: user?.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plc-codes'] });
      toast.success('Code saved successfully');
    },
    onError: (error) => {
      toast.error('Failed to save code: ' + error.message);
    }
  });

  const updatePLCCode = useMutation({
    mutationFn: async ({ id, code, title }: { id: string; code: string; title: string }) => {
      const { data, error } = await supabase
        .from('plc_code')
        .update({ code, title })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plc-codes'] });
      toast.success('Code updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update code: ' + error.message);
    }
  });
  
  const deletePLCCode = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('plc_code')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plc-codes'] });
      toast.success('Code deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete code: ' + error.message);
    }
  });
  
  const duplicatePLCCode = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      // First, get the code to duplicate
      const { data: originalCode, error: fetchError } = await supabase
        .from('plc_code')
        .select('code')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      
      // Then create a new entry with the same code
      const { data, error } = await supabase
        .from('plc_code')
        .insert([{ code: originalCode.code, title, user_id: user?.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plc-codes'] });
      toast.success('Code duplicated successfully');
    },
    onError: (error) => {
      toast.error('Failed to duplicate code: ' + error.message);
    }
  });

  return {
    plcCodes,
    isLoading,
    savePLCCode,
    updatePLCCode,
    deletePLCCode,
    duplicatePLCCode
  };
};
