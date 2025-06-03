-- Development seed data
-- Insert test session
INSERT INTO sessions (id, name, host_id, config, expires_at)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440000', 'Test Session 1', 
   NULL, -- Will be updated after creating host player
   '{"cardValues": ["1", "2", "3", "5", "8", "13", "21", "?"], "timerSeconds": 60, "allowSpectators": true}',
   CURRENT_TIMESTAMP + INTERVAL '48 hours');

-- Insert test players
INSERT INTO players (id, session_id, name, avatar, is_spectator)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Test Host', '👨‍💼', false),
  ('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'Test Player', '👩‍💻', false),
  ('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 'Test Spectator', '👀', true);

-- Update session with host_id
UPDATE sessions 
SET host_id = '550e8400-e29b-41d4-a716-446655440001'
WHERE id = '550e8400-e29b-41d4-a716-446655440000';

-- Insert test stories
INSERT INTO stories (id, session_id, title, description, order_index)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440000', 
   'Implement user authentication', 'Add login/logout functionality with JWT tokens', 1),
  ('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440000', 
   'Create dashboard UI', 'Design and implement the main dashboard view', 2);

-- Insert test votes for the first story
INSERT INTO votes (story_id, player_id, session_id, value, confidence)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440001', 
   '550e8400-e29b-41d4-a716-446655440000', '5', 4),
  ('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440002', 
   '550e8400-e29b-41d4-a716-446655440000', '8', 3);