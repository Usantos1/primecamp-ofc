import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useTrainings } from '@/hooks/useTrainings';
import { useUsers } from '@/hooks/useUsers';
import { UserCheck } from 'lucide-react';
import { MultiSelect } from '@/components/ui/multi-select';

export default function AdminAssignments() {
  const { trainings, assignTraining } = useTrainings();
  const { users } = useUsers();
  const [selectedTraining, setSelectedTraining] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const handleAssign = async () => {
    if (!selectedTraining || selectedUsers.length === 0) {
      return;
    }

    await assignTraining.mutateAsync({
      trainingId: selectedTraining,
      userIds: selectedUsers
    });

    setSelectedTraining('');
    setSelectedUsers([]);
  };

  const userOptions = users?.map(u => ({
    value: u.user_id,
    label: u.display_name || u.phone || 'Sem nome'
  })) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="h-5 w-5" />
          Atribuir Treinamentos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Treinamento</Label>
          <Select value={selectedTraining} onValueChange={setSelectedTraining}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um treinamento" />
            </SelectTrigger>
            <SelectContent>
              {trainings?.map(training => (
                <SelectItem key={training.id} value={training.id}>
                  {training.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Usuários</Label>
          <MultiSelect
            options={userOptions}
            selected={selectedUsers}
            onChange={setSelectedUsers}
            placeholder="Selecione os usuários"
          />
        </div>

        <Button 
          onClick={handleAssign} 
          disabled={!selectedTraining || selectedUsers.length === 0}
          className="w-full"
        >
          Atribuir Treinamento
        </Button>
      </CardContent>
    </Card>
  );
}
