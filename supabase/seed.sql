-- Local development seed. Run once via the Supabase SQL editor.
-- Three short passages spanning A1->B1 with deliberately varied verb forms
-- (present, preterite, imperfect, gerunds) so tap-to-translate and clitic
-- handling have real coverage to exercise.

insert into public.passages (title, body, level) values
  ('Mi familia',
   'Me llamo Ana. Tengo veinticinco años y vivo en Madrid. Mi familia es pequeña: mis padres, mi hermano y yo. Mi padre trabaja en un banco y mi madre es profesora. Mi hermano estudia en la universidad. Los fines de semana, comemos juntos en casa de mis abuelos.',
   'A1'),
  ('Una mañana de octubre',
   'Era una mañana fría de octubre. Salí de casa muy temprano y caminé hacia la estación. El tren llegó tarde, como siempre. Cuando finalmente subí, encontré un asiento junto a la ventana y empecé a leer mi libro. El paisaje pasaba rápidamente: campos amarillos, pueblos pequeños, montañas a lo lejos.',
   'A2'),
  ('El mercado del domingo',
   'Todos los domingos por la mañana, mi abuela me llevaba al mercado del pueblo. Recuerdo el olor del pan recién horneado y los gritos de los vendedores anunciando sus precios. Ella sabía exactamente qué comprar y dónde, y los comerciantes la conocían por su nombre. Aprendí más sobre la vida en aquellas mañanas que en muchos libros de la escuela.',
   'B1');
