package com.server.service;

import com.server.entity.User;
import com.server.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User createUser(User user) {
        if (userRepository.existsByUsername(user.getUsername())) {
            throw new IllegalArgumentException("用户名已存在: " + user.getUsername());
        }
        if (user.getStatus() == null) {
            user.setStatus(1);
        }
        return userRepository.save(user);
    }

    public Optional<User> getUserById(Long id) {
        return userRepository.findById(id);
    }

    public Optional<User> getUserByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public User updateUser(Long id, User updated) {
        User existing = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("用户不存在: " + id));

        if (updated.getUsername() != null) {
            existing.setUsername(updated.getUsername());
        }
        if (updated.getPassword() != null) {
            existing.setPassword(updated.getPassword());
        }
        if (updated.getNickname() != null) {
            existing.setNickname(updated.getNickname());
        }
        if (updated.getEmail() != null) {
            existing.setEmail(updated.getEmail());
        }
        if (updated.getAvatar() != null) {
            existing.setAvatar(updated.getAvatar());
        }
        if (updated.getStatus() != null) {
            existing.setStatus(updated.getStatus());
        }
        return userRepository.save(existing);
    }

    public void deleteUser(Long id) {
        if (!userRepository.existsById(id)) {
            throw new IllegalArgumentException("用户不存在: " + id);
        }
        userRepository.deleteById(id);
    }
}