#include <memory>
#include <iostream>
#include <concepts>
#include <optional>

// Node structure
template <typename T>
struct Node {
    T value;
    std::unique_ptr<Node<T>> next;

    explicit Node(T val) : value(std::move(val)), next(nullptr) {}
};

// Linked List class
template <typename T>
class LinkedList {
public:
    LinkedList() : head(nullptr), size(0) {}

    // Add an element to the end of the list
    void push_back(const T& value) {
        auto newNode = std::make_unique<Node<T>>(value);

        if (!head) {
            head = std::move(newNode);
        } else {
            Node<T>* current = head.get();
            while (current->next) {
                current = current->next.get();
            }
            current->next = std::move(newNode);
        }
        ++size;
    }

    // Remove the first occurrence of a value
    bool remove(const T& value) {
        if (!head) return false;

        if (head->value == value) {
            head = std::move(head->next);
            --size;
            return true;
        }

        Node<T>* current = head.get();
        while (current->next && current->next->value != value) {
            current = current->next.get();
        }

        if (current->next && current->next->value == value) {
            current->next = std::move(current->next->next);
            --size;
            return true;
        }

        return false;
    }

    // Find a value in the list
    std::optional<T> find(const T& value) const {
        Node<T>* current = head.get();
        while (current) {
            if (current->value == value) {
                return current->value;
            }
            current = current->next.get();
        }
        return std::nullopt;
    }

    // Print the list
    void print() const {
        Node<T>* current = head.get();
        while (current) {
            std::cout << current->value << " -> ";
            current = current->next.get();
        }
        std::cout << "null\n";
    }

    // Get the size of the list
    [[nodiscard]] size_t get_size() const {
        return size;
    }

private:
    std::unique_ptr<Node<T>> head;
    size_t size;
};

int main() {
    LinkedList<int> list;
    list.push_back(10);
    list.push_back(20);
    list.push_back(30);

    std::cout << "Initial list: ";
    list.print();

    list.remove(20);
    std::cout << "After removing 20: ";
    list.print();

    auto result = list.find(30);
    if (result) {
        std::cout << "Found: " << *result << "\n";
    } else {
        std::cout << "Value not found\n";
    }

    std::cout << "List size: " << list.get_size() << "\n";

    return 0;
}
