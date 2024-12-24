#include <iostream>
#include <memory>
#include <optional>

// Node structure
template <typename T>
struct Node {
    T value;
    std::unique_ptr<Node<T>> next;

    explicit Node(T val) : value(std::move(val)), next(nullptr) {}
};

// Circular Linked List class
template <typename T>
class CircularLinkedList {
public:
    CircularLinkedList() : head(nullptr), size(0) {}

    // Add an element to the end of the list (circular)
    void push_back(const T& value) {
        auto newNode = std::make_unique<Node<T>>(value);

        if (!head) {
            head = std::move(newNode);
            head->next = head.get();  // Points to itself, making it circular
        } else {
            Node<T>* current = head.get();
            while (current->next != head.get()) {
                current = current->next.get();
            }
            current->next = std::move(newNode);
            current->next->next = head.get();  // Circular link
        }
        ++size;
    }

    // Iterator class
    class Iterator {
    public:
        Iterator(Node<T>* node) : current(node) {}

        T& operator*() const {
            return current->value;
        }

        Iterator& operator++() {
            current = current->next.get(); // Move to the next node (wraps around)
            return *this;
        }

        bool operator!=(const Iterator& other) const {
            return current != other.current;
        }

    private:
        Node<T>* current;
    };

    // Begin and end methods for iteration
    Iterator begin() {
        return Iterator(head.get());
    }

    Iterator end() {
        return Iterator(nullptr); // End is an invalid iterator
    }

    // Print the list (used for debugging)
    void print() const {
        if (!head) return;
        Node<T>* current = head.get();
        do {
            std::cout << current->value << " -> ";
            current = current->next.get();
        } while (current != head.get());
        std::cout << "(circular)\n";
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
    CircularLinkedList<int> list;
    list.push_back(10);
    list.push_back(20);
    list.push_back(30);

    std::cout << "Circular List: ";
    list.print();

    std::cout << "Iterating through the circular list: ";
    for (auto it = list.begin(); it != list.begin(); ++it) {
        std::cout << *it << " -> ";
    }

    return 0;
}
