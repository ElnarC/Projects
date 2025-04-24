import numpy as np
import random
import pygame
import sys
import torch
import torch.nn as nn
import torch.optim as optim
from collections import deque
import os

def train_ai(load_file=None, save_interval=100, eval_interval=10):
    save_dir = r""
    os.makedirs(save_dir, exist_ok=True)

    game = Game2048()
    agent = Agent(16, 4)
    gui = GameGUI(game)

    num_episodes = 10000
    batch_size = 64
    start_episode = 0

    if load_file:
        full_load_path = os.path.join(save_dir, load_file)
        agent.load(full_load_path)
        start_episode = int(load_file.split('_')[-1].split('.')[0])

    best_score = 0

    for episode in range(start_episode, start_episode + num_episodes):
        # ... (rest of the training loop remains the same)

        if (episode + 1) % save_interval == 0:
            save_file = os.path.join(save_dir, f"2048_ai_model_{episode + 1}.pth")
            agent.save(save_file)
            print(f"Saved model to {save_file}")

        if (episode + 1) % eval_interval == 0:
            eval_score = evaluate_ai(agent, game, gui)
            print(f"Evaluation Score: {eval_score}")
            if eval_score > best_score:
                best_score = eval_score
                best_model_path = os.path.join(save_dir, "best_model.pth")
                agent.save(best_model_path)
                print(f"New best model saved with score: {best_score}")

    print("Training finished.")

class Game2048:
    def __init__(self, size=4):
        self.size = size
        self.reset()

    def reset(self):
        self.board = np.zeros((self.size, self.size), dtype=int)
        self.add_new_tile()
        self.add_new_tile()
        return self.get_state()

    def add_new_tile(self):
        empty_cells = [(i, j) for i in range(self.size) for j in range(self.size) if self.board[i, j] == 0]
        if empty_cells:
            i, j = random.choice(empty_cells)
            self.board[i, j] = 2 if random.random() < 0.9 else 4

    def get_state(self):
        return self.board.flatten()

    def move(self, direction):
        original_board = self.board.copy()
        merged = [[False] * self.size for _ in range(self.size)]
        
        if direction == 0:  # Up
            for j in range(self.size):
                for i in range(1, self.size):
                    if self.board[i, j]:
                        row = i
                        while row > 0 and (self.board[row-1, j] == 0 or (self.board[row-1, j] == self.board[row, j] and not merged[row-1][j])):
                            if self.board[row-1, j] == 0:
                                self.board[row-1, j] = self.board[row, j]
                                self.board[row, j] = 0
                            elif self.board[row-1, j] == self.board[row, j]:
                                self.board[row-1, j] *= 2
                                self.board[row, j] = 0
                                merged[row-1][j] = True
                            row -= 1
        elif direction == 1:  # Down
            for j in range(self.size):
                for i in range(self.size - 2, -1, -1):
                    if self.board[i, j]:
                        row = i
                        while row < self.size - 1 and (self.board[row+1, j] == 0 or (self.board[row+1, j] == self.board[row, j] and not merged[row+1][j])):
                            if self.board[row+1, j] == 0:
                                self.board[row+1, j] = self.board[row, j]
                                self.board[row, j] = 0
                            elif self.board[row+1, j] == self.board[row, j]:
                                self.board[row+1, j] *= 2
                                self.board[row, j] = 0
                                merged[row+1][j] = True
                            row += 1
        elif direction == 2:  # Left
            for i in range(self.size):
                for j in range(1, self.size):
                    if self.board[i, j]:
                        col = j
                        while col > 0 and (self.board[i, col-1] == 0 or (self.board[i, col-1] == self.board[i, col] and not merged[i][col-1])):
                            if self.board[i, col-1] == 0:
                                self.board[i, col-1] = self.board[i, col]
                                self.board[i, col] = 0
                            elif self.board[i, col-1] == self.board[i, col]:
                                self.board[i, col-1] *= 2
                                self.board[i, col] = 0
                                merged[i][col-1] = True
                            col -= 1
        elif direction == 3:  # Right
            for i in range(self.size):
                for j in range(self.size - 2, -1, -1):
                    if self.board[i, j]:
                        col = j
                        while col < self.size - 1 and (self.board[i, col+1] == 0 or (self.board[i, col+1] == self.board[i, col] and not merged[i][col+1])):
                            if self.board[i, col+1] == 0:
                                self.board[i, col+1] = self.board[i, col]
                                self.board[i, col] = 0
                            elif self.board[i, col+1] == self.board[i, col]:
                                self.board[i, col+1] *= 2
                                self.board[i, col] = 0
                                merged[i][col+1] = True
                            col += 1

        if not np.array_equal(original_board, self.board):
            self.add_new_tile()

        return self.get_state(), self.is_game_over()

    def is_game_over(self):
        if np.any(self.board == 0):
            return False
        for i in range(self.size):
            for j in range(self.size):
                if i < self.size - 1 and self.board[i, j] == self.board[i+1, j]:
                    return False
                if j < self.size - 1 and self.board[i, j] == self.board[i, j+1]:
                    return False
        return True

class DQN(nn.Module):
    def __init__(self, input_size, output_size):
        super(DQN, self).__init__()
        self.fc1 = nn.Linear(input_size, 256)
        self.fc2 = nn.Linear(256, 256)
        self.fc3 = nn.Linear(256, output_size)

    def forward(self, x):
        x = torch.relu(self.fc1(x))
        x = torch.relu(self.fc2(x))
        return self.fc3(x)

class Agent:
    def __init__(self, state_size, action_size):
        self.state_size = state_size
        self.action_size = action_size
        self.memory = deque(maxlen=100000)
        self.gamma = 0.99
        self.epsilon = 1.0
        self.epsilon_min = 0.01
        self.epsilon_decay = 0.995
        self.learning_rate = 0.001
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = DQN(state_size, action_size).to(self.device)
        self.target_model = DQN(state_size, action_size).to(self.device)
        self.target_model.load_state_dict(self.model.state_dict())
        self.optimizer = optim.Adam(self.model.parameters(), lr=self.learning_rate)
        self.criterion = nn.MSELoss()
        self.update_target_every = 5

    def remember(self, state, action, reward, next_state, done):
        self.memory.append((state, action, reward, next_state, done))

    def act(self, state, evaluate=False):
        if not evaluate and random.random() <= self.epsilon:
            return random.randrange(self.action_size)
        state = torch.FloatTensor(state).unsqueeze(0).to(self.device)
        with torch.no_grad():
            action_values = self.model(state)
        return torch.argmax(action_values).item()

    def replay(self, batch_size):
        if len(self.memory) < batch_size:
            return
        minibatch = random.sample(self.memory, batch_size)
        states, actions, rewards, next_states, dones = zip(*minibatch)

        states = torch.FloatTensor(states).to(self.device)
        actions = torch.LongTensor(actions).to(self.device)
        rewards = torch.FloatTensor(rewards).to(self.device)
        next_states = torch.FloatTensor(next_states).to(self.device)
        dones = torch.FloatTensor(dones).to(self.device)

        current_q_values = self.model(states).gather(1, actions.unsqueeze(1))
        next_q_values = self.target_model(next_states).max(1)[0]
        target_q_values = rewards + (self.gamma * next_q_values * (1 - dones))

        loss = self.criterion(current_q_values, target_q_values.unsqueeze(1))
        self.optimizer.zero_grad()
        loss.backward()
        self.optimizer.step()

        if self.epsilon > self.epsilon_min:
            self.epsilon *= self.epsilon_decay

    def update_target_model(self):
        self.target_model.load_state_dict(self.model.state_dict())

    def save(self, filename):
        torch.save({
            'model_state_dict': self.model.state_dict(),
            'optimizer_state_dict': self.optimizer.state_dict(),
            'epsilon': self.epsilon,
            'memory': self.memory
        }, filename)

    def load(self, filename):
        if os.path.isfile(filename):
            checkpoint = torch.load(filename)
            self.model.load_state_dict(checkpoint['model_state_dict'])
            self.target_model.load_state_dict(checkpoint['model_state_dict'])
            self.optimizer.load_state_dict(checkpoint['optimizer_state_dict'])
            self.epsilon = checkpoint['epsilon']
            self.memory = checkpoint['memory']
            print(f"Loaded model from {filename}")
        else:
            print(f"No saved model found at {filename}")

class GameGUI:
    def __init__(self, game):
        self.game = game
        pygame.init()
        self.screen = pygame.display.set_mode((400, 500))
        pygame.display.set_caption("2048 AI")
        self.font = pygame.font.Font(None, 36)
        self.colors = {
            0: (204, 192, 179),
            2: (238, 228, 218),
            4: (237, 224, 200),
            8: (242, 177, 121),
            16: (245, 149, 99),
            32: (246, 124, 95),
            64: (246, 94, 59),
            128: (237, 207, 114),
            256: (237, 204, 97),
            512: (237, 200, 80),
            1024: (237, 197, 63),
            2048: (237, 194, 46)
        }

    def draw(self):
        self.screen.fill((187, 173, 160))
        for i in range(4):
            for j in range(4):
                value = self.game.board[i, j]
                color = self.colors.get(value, (0, 0, 0))
                pygame.draw.rect(self.screen, color, (j*100+10, i*100+10, 90, 90))
                if value != 0:
                    text = self.font.render(str(value), True, (0, 0, 0))
                    text_rect = text.get_rect(center=(j*100+55, i*100+55))
                    self.screen.blit(text, text_rect)
        pygame.display.flip()

def calculate_reward(old_state, new_state):
    old_max = np.max(old_state)
    new_max = np.max(new_state)
    if new_max > old_max:
        return np.log2(new_max)
    return -0.1  # Small penalty for moves that don't increase the max tile

def train_ai(load_file=None, save_interval=100, eval_interval=10):
    game = Game2048()
    agent = Agent(16, 4)
    gui = GameGUI(game)

    num_episodes = 10000
    batch_size = 64
    start_episode = 0

    if load_file:
        agent.load(load_file)
        start_episode = int(load_file.split('_')[-1].split('.')[0])

    best_score = 0

    for episode in range(start_episode, start_episode + num_episodes):
        state = game.reset()
        total_reward = 0
        done = False

        while not done:
            action = agent.act(state)
            next_state, done = game.move(action)
            reward = calculate_reward(state, next_state)
            agent.remember(state, action, reward, next_state, done)
            state = next_state
            total_reward += reward

            agent.replay(batch_size)
            gui.draw()

            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    pygame.quit()
                    sys.exit()

        if episode % agent.update_target_every == 0:
            agent.update_target_model()

        print(f"Episode: {episode+1}/{start_episode + num_episodes}, Score: {np.max(game.board)}, Total Reward: {total_reward}")

        if (episode + 1) % save_interval == 0:
            save_file = f"2048_ai_model_{episode + 1}.pth"
            agent.save(save_file)
            print(f"Saved model to {save_file}")

        if (episode + 1) % eval_interval == 0:
            eval_score = evaluate_ai(agent, game, gui)
            print(f"Evaluation Score: {eval_score}")
            if eval_score > best_score:
                best_score = eval_score
                agent.save("best_model.pth")
                print(f"New best model saved with score: {best_score}")

    print("Training finished.")

import pygame

def evaluate_ai(agent, game, gui, num_games=5):
    total_score = 0
    for _ in range(num_games):
        state = game.reset()
        done = False
        while not done:
            action = agent.act(state, evaluate=True)
            state, done = game.move(action)
            gui.draw()
            pygame.event.pump()  # Process events to keep the GUI responsive
            pygame.time.wait(50)  # Add a small delay to make the evaluation visible
        total_score += np.max(game.board)
    return total_score / num_games

def train_ai(load_file=None, save_interval=100, eval_interval=10):
    save_dir = r""
    os.makedirs(save_dir, exist_ok=True)

    game = Game2048()
    agent = Agent(16, 4)
    gui = GameGUI(game)

    num_episodes = 10000
    batch_size = 64
    start_episode = 0

    if load_file:
        full_load_path = os.path.join(save_dir, load_file)
        agent.load(full_load_path)
        start_episode = int(load_file.split('_')[-1].split('.')[0])

    best_score = 0

    for episode in range(start_episode, start_episode + num_episodes):
        state = game.reset()
        total_reward = 0
        done = False

        while not done:
            action = agent.act(state)
            next_state, done = game.move(action)
            reward = calculate_reward(state, next_state)
            agent.remember(state, action, reward, next_state, done)
            state = next_state
            total_reward += reward

            agent.replay(batch_size)
            gui.draw()

            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    pygame.quit()
                    sys.exit()

        if episode % agent.update_target_every == 0:
            agent.update_target_model()

        print(f"Episode: {episode+1}/{start_episode + num_episodes}, Score: {np.max(game.board)}, Total Reward: {total_reward}")

        if (episode + 1) % save_interval == 0:
            save_file = os.path.join(save_dir, f"2048_ai_model_{episode + 1}.pth")
            agent.save(save_file)
            print(f"Saved model to {save_file}")

        if (episode + 1) % eval_interval == 0:
            print("Starting evaluation...")
            eval_score = evaluate_ai(agent, game, gui)
            print(f"Evaluation Score: {eval_score}")
            if eval_score > best_score:
                best_score = eval_score
                best_model_path = os.path.join(save_dir, "best_model.pth")
                agent.save(best_model_path)
                print(f"New best model saved with score: {best_score}")

    print("Training finished.")

if __name__ == "__main__":
    save_dir = r""
    load_file = None  # Set this to the filename of a saved model if you want to resume training
    if load_file:
        load_file = os.path.join(save_dir, load_file)
    train_ai(load_file)
