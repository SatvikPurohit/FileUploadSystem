import { useMutation } from "@tanstack/react-query";
import { AxiosProgressEvent } from "axios";
import axios from "../api/axiosSetup";
import type { UploadItem } from "../types";

type MutVars = { item: UploadItem; signal?: AbortSignal };
type UploadResult = unknown;

interface UseUploadMutationProps {
  onProgress: (id: string, progress: number) => void;
  onSuccess: (itemId: string) => void;
  onError: (itemId: string, error: string) => void;
  fileMap: React.MutableRefObject<Map<string, File>>;
}

export const useUploadMutation = ({
  onProgress,
  onSuccess,
  onError,
  fileMap,
}: UseUploadMutationProps) => {
  // api call used via mutation
  const uploadSingle = async (
    item: UploadItem,
    signal?: AbortSignal
  ): Promise<UploadResult> => {
    
    const file = fileMap.current.get(item.id);
    if (!file) throw new Error("File not found");

    const form = new FormData();
    form.append("file", file);

    const res = await axios.post("/upload", form, {
      withCredentials: true,
      signal, // for cancellation
      onUploadProgress: (progressEvent: AxiosProgressEvent) => {
        const loaded = progressEvent.loaded ?? 0;
        const total = progressEvent.total ?? file.size;
        const pct = total ? Math.round((loaded * 100) / total) : 0;
        onProgress(item.id, pct);
      },
    });

    return res.data;
  };

  return useMutation<UploadResult, Error, MutVars, unknown>({
    mutationFn: async (vars: MutVars) => uploadSingle(vars.item, vars.signal),

    onSuccess: (_data, vars) => {
      onSuccess(vars.item.id);
    },

    onError: (err: unknown, vars) => {
      const message =
        (err as any)?.response?.data?.error ??
        (err as any)?.message ??
        "Upload error";
      onError(vars.item.id, message);
    },
  });
};
