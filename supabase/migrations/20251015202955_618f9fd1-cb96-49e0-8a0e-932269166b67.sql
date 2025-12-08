-- Criar trigger para impedir edição de campos já preenchidos por não-admins
-- Apenas permite preencher campos NULL (bater ponto pela primeira vez)

CREATE OR REPLACE FUNCTION public.prevent_time_clock_edit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins podem editar tudo
  IF has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  -- Membros só podem preencher campos vazios, não alterar campos já preenchidos
  IF OLD.clock_in IS NOT NULL AND NEW.clock_in IS DISTINCT FROM OLD.clock_in THEN
    RAISE EXCEPTION 'Você não pode editar o horário de entrada. Contate um administrador.';
  END IF;

  IF OLD.lunch_start IS NOT NULL AND NEW.lunch_start IS DISTINCT FROM OLD.lunch_start THEN
    RAISE EXCEPTION 'Você não pode editar o horário de início do almoço. Contate um administrador.';
  END IF;

  IF OLD.lunch_end IS NOT NULL AND NEW.lunch_end IS DISTINCT FROM OLD.lunch_end THEN
    RAISE EXCEPTION 'Você não pode editar o horário de término do almoço. Contate um administrador.';
  END IF;

  IF OLD.break_start IS NOT NULL AND NEW.break_start IS DISTINCT FROM OLD.break_start THEN
    RAISE EXCEPTION 'Você não pode editar o horário de início da pausa. Contate um administrador.';
  END IF;

  IF OLD.break_end IS NOT NULL AND NEW.break_end IS DISTINCT FROM OLD.break_end THEN
    RAISE EXCEPTION 'Você não pode editar o horário de término da pausa. Contate um administrador.';
  END IF;

  IF OLD.clock_out IS NOT NULL AND NEW.clock_out IS DISTINCT FROM OLD.clock_out THEN
    RAISE EXCEPTION 'Você não pode editar o horário de saída. Contate um administrador.';
  END IF;

  RETURN NEW;
END;
$$;

-- Aplicar trigger na tabela time_clock
DROP TRIGGER IF EXISTS enforce_time_clock_immutability ON public.time_clock;

CREATE TRIGGER enforce_time_clock_immutability
BEFORE UPDATE ON public.time_clock
FOR EACH ROW
EXECUTE FUNCTION public.prevent_time_clock_edit();