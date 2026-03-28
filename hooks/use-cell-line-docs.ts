import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

export type CellLineDoc = {
  id: string;
  storage_path: string;
  mime_type: string;
  created_at: string;
};

async function listDocs(cellLineId: string) {
  const { data, error } = await supabase
    .from('cell_line_docs')
    .select('id, storage_path, mime_type, created_at')
    .eq('cell_line_id', cellLineId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as CellLineDoc[];
}

export function useCellLineDocs(cellLineId: string | null) {
  return useQuery({
    queryKey: ['cell_line_docs', cellLineId],
    queryFn: () => listDocs(cellLineId as string),
    enabled: !!cellLineId,
  });
}

export function useUploadCellLineDoc(cellLineId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!cellLineId) throw new Error('Missing cell line id');
      if (!user) throw new Error('Not authenticated');

      // Let user pick either an image or a PDF from files.
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const uri = asset.uri;
      const mimeType = asset.mimeType ?? 'application/octet-stream';

      const response = await fetch(uri);
      const blob = await response.blob();

      const fileExt = asset.name?.split('.').pop() ?? (mimeType === 'application/pdf' ? 'pdf' : 'bin');
      const objectPath = `${user.id}/${cellLineId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('cell_line_docs')
        .upload(objectPath, blob, {
          contentType: mimeType,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { error: insertError } = await supabase.from('cell_line_docs').insert({
        cell_line_id: cellLineId,
        storage_path: objectPath,
        mime_type: mimeType,
        uploaded_by: user.id,
      });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      if (!cellLineId) return;
      queryClient.invalidateQueries({ queryKey: ['cell_line_docs', cellLineId] });
    },
  });
}

