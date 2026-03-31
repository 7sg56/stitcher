-- ============================================
-- Onboarding & Alias Pool
-- ============================================

-- Add onboarding status to users
ALTER TABLE users ADD COLUMN onboarding_status TEXT NOT NULL DEFAULT 'pending';

-- ============================================
-- ALIAS NAME POOL
-- ============================================
-- Random adjective+noun combos assigned to students on onboarding.
-- When a combo is assigned, is_used is set to TRUE.
CREATE TABLE alias_pool (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  adjective TEXT NOT NULL,
  noun      TEXT NOT NULL,
  is_used   BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE(adjective, noun)
);

-- Seed ~50 combinations (expand as needed)
INSERT INTO alias_pool (adjective, noun) VALUES
  ('Swift', 'Falcon'),   ('Quiet', 'Panda'),    ('Bold', 'Tiger'),
  ('Clever', 'Fox'),     ('Bright', 'Owl'),      ('Calm', 'Dolphin'),
  ('Fierce', 'Eagle'),   ('Noble', 'Wolf'),      ('Wise', 'Raven'),
  ('Lucky', 'Cat'),      ('Brave', 'Lion'),      ('Keen', 'Hawk'),
  ('Nimble', 'Deer'),    ('Sharp', 'Lynx'),      ('Witty', 'Parrot'),
  ('Gentle', 'Dove'),    ('Agile', 'Cheetah'),   ('Sturdy', 'Bear'),
  ('Daring', 'Cobra'),   ('Silent', 'Panther'),  ('Vivid', 'Phoenix'),
  ('Sleek', 'Otter'),    ('Steady', 'Turtle'),   ('Mystic', 'Dragon'),
  ('Crafty', 'Raccoon'), ('Lively', 'Hare'),     ('Proud', 'Stallion'),
  ('Sly', 'Viper'),      ('Golden', 'Oriole'),   ('Rustic', 'Badger'),
  ('Polar', 'Penguin'),  ('Cosmic', 'Whale'),    ('Jade', 'Gecko'),
  ('Amber', 'Moth'),     ('Azure', 'Jay'),       ('Crimson', 'Finch'),
  ('Ivory', 'Swan'),     ('Onyx', 'Rook'),       ('Ruby', 'Koi'),
  ('Silver', 'Crane'),   ('Velvet', 'Mink'),     ('Copper', 'Wren'),
  ('Frost', 'Heron'),    ('Storm', 'Hawk'),      ('Ember', 'Starling'),
  ('Sage', 'Ibis'),      ('Dusk', 'Bat'),        ('Dawn', 'Lark'),
  ('Iron', 'Rhino'),     ('Cobalt', 'Orca');

ALTER TABLE alias_pool ENABLE ROW LEVEL SECURITY;
