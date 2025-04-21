
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

  return {
    plcCodes,
    isLoading,
    savePLCCode,
    updatePLCCode
  };
};
