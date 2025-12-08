import { useAuth } from '@/contexts/AuthContext';
import { useParams } from 'react-router-dom';
import StudentTrainings from './StudentTrainings';
import AdminTrainings from './AdminTrainings';
import CourseView from './CourseView';

export default function TrainingsIndex() {
  const { isAdmin } = useAuth();
  const { trainingId } = useParams();
  
  // Se tem trainingId na URL, mostrar CourseView
  if (trainingId) {
    return <CourseView />;
  }
  
  // Caso contrário, mostrar lista baseada no role
  return isAdmin ? <AdminTrainings /> : <StudentTrainings />;
}
