import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { family } from "@/lib/api";

export function useFamilyMembers(familyId: string | null) {
  return useQuery({
    queryKey: ["family-members", familyId],
    queryFn: () => family.getMembers(familyId!),
    enabled: !!familyId,
  });
}

export function useToggleAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberId: string) => family.toggleAdmin(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family-members"] });
    },
  });
}
